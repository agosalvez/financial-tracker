const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database/database');
const { categorizeTransaction } = require('../services/categorization');
const ParserManager = require('../parsers/parser-manager');

const router = express.Router();

/**
 * Procesa un archivo individual
 * @param {Object} file - Archivo de multer
 * @param {string} bankId - ID del banco
 * @param {Object} insertStatement - Statement preparado para inserción
 * @param {Object} db - Conexión a la base de datos
 * @returns {Promise<Object>} - Resultado del procesamiento
 */
async function processFile(file, bankId, insertStatement, db) {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!['.csv', '.xlsx', '.xls'].includes(fileExtension)) {
    throw new Error('Solo se aceptan archivos CSV o Excel (.csv, .xlsx, .xls)');
  }

  let parseResult;
  if (fileExtension === '.csv') {
    // Parsear archivo CSV
    parseResult = await parserManager.parseFile(file.path, bankId);
  } else {
    // Parsear archivo Excel
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Analizar estructura del Excel
    const structure = analyzeCSVStructure(data);
    
    parseResult = {
      success: true,
      transactions: data.map(row => {
        const { date, time } = parseDate(row[structure.columnMapping.fecha]);
        return {
          fecha: date,
          hora: time,
          concepto: row[structure.columnMapping.concepto],
          importe: parseAmount(row[structure.columnMapping.importe]),
          balance: parseAmount(row[structure.columnMapping.balance]),
          banco: bankId
        };
      })
    };
  }

  if (!parseResult || !parseResult.success) {
    throw new Error(parseResult?.message || 'Error al procesar el archivo');
  }

  let importedCount = 0;
  const errors = [];
  const totalTransactions = parseResult.transactions.length;

  console.log(`\n🚀 Iniciando importación de ${totalTransactions} transacciones...\n`);

  // Procesar transacciones
  for (const [index, transaction] of parseResult.transactions.entries()) {
    const currentNumber = index + 1;
    console.log(`\n[${currentNumber}/${totalTransactions}] Procesando: ${transaction.concepto}`);
    try {
      if (!transaction.fecha || !transaction.concepto) {
        throw new Error('Fecha y concepto son obligatorios');
      }

      let category;
      try {
        const categorization = await categorizeTransaction(transaction.concepto, transaction.importe);
        category = db.prepare('SELECT nombre, tipo FROM categories WHERE id = ?').get(categorization.category_id);
      } catch (error) {
        console.error('Error en categorización:', error);
        // Si falla la categorización, usar la categoría "Otros"
        category = db.prepare('SELECT nombre, tipo FROM categories WHERE nombre = ?').get('Otros');
      }
      
      if (!category) {
        console.warn('No se encontró categoría, usando "Otros"');
        category = { nombre: 'Otros', tipo: transaction.importe > 0 ? 'ingreso' : 'gasto' };
      }

      try {
        insertStatement.run(
          transaction.fecha,
          transaction.hora,
          transaction.concepto,
          transaction.importe,
          transaction.balance,
          category.nombre,
          transaction.banco || parseResult.bank
        );
        importedCount++;
      } catch (error) {
        console.error('Error insertando transacción:', error);
        errors.push(`Error en transacción ${transaction.concepto}: ${error.message}`);
      }

      // Pequeña pausa entre transacciones
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      errors.push(`Error en transacción: ${error.message}`);
    }
  }

  // Resumen final
  console.log(`\n✅ Importación completada: ${importedCount}/${totalTransactions} transacciones procesadas`);
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} errores encontrados`);
  }

  return {
    count: importedCount,
    errors: errors.length > 0 ? errors : undefined,
    bank: parseResult.bank
  };
}

// Inicializar ParserManager con manejo de errores
let parserManager;
try {
  parserManager = new ParserManager();
} catch (error) {
  console.error('❌ Error inicializando sistema de parsers:', error);
  parserManager = null;
}

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)'), false);
    }
  }
});

/**
 * @swagger
 * /api/upload/banks:
 *   get:
 *     summary: Obtiene la lista de bancos soportados
 *     tags: [Upload]
 *     responses:
 *       200:
 *         description: Lista de bancos soportados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 banks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "eurocaja-rural"
 *                       name:
 *                         type: string
 *                         example: "Eurocaja Rural"
 *                       description:
 *                         type: string
 *                         example: "Parser para archivos CSV de Eurocaja Rural"
 */
router.get('/banks', (req, res) => {
  try {
      if (!parserManager) {
      throw new Error('Sistema de parsers no disponible');
    }

    const banks = parserManager.getSupportedBanks();
    res.json({ banks });

  } catch (error) {
    console.error('❌ Error obteniendo bancos soportados:', error);
    res.status(500).json({ 
      error: 'Error obteniendo bancos soportados',
      message: error.message 
    });
  }
});


/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Subir archivo Excel con transacciones
 *     description: Importa transacciones desde un archivo Excel (.xlsx o .xls) con categorización automática
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo Excel con transacciones (máximo 10MB)
 *     responses:
 *       200:
 *         description: Archivo procesado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Se importaron 150 transacciones correctamente'
 *                 count:
 *                   type: integer
 *                   description: Número de transacciones importadas
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Lista de errores encontrados durante la importación
 *       400:
 *         description: Error en el archivo o datos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     no_file:
 *                       value: 'No se proporcionó ningún archivo'
 *                     empty_file:
 *                       value: 'El archivo Excel está vacío'
 *                     missing_columns:
 *                       value: 'Faltan las siguientes columnas requeridas: fecha, concepto'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.post('/', upload.single('files'), async (req, res) => {
  try {
    if (!parserManager) {
      throw new Error('Sistema de parsers no disponible');
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const bankId = req.body.bankId;
    if (!bankId) {
      return res.status(400).json({ 
        error: 'Es necesario seleccionar un banco',
        message: 'Por favor, selecciona el banco correspondiente al archivo'
      });
    }

    const db = getDatabase();

    // Preparar statement para inserción
    const insertTransaction = db.prepare(`
      INSERT INTO transactions (fecha, hora, concepto, importe, balance, categoria, banco)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let result;
    try {
      result = await processFile(req.file, bankId, insertTransaction, db);
    } catch (error) {
      throw error;
    } finally {
      // Limpiar archivo temporal
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    res.json({
      message: `Se importaron ${result.count} transacciones correctamente`,
      count: result.count,
      errors: result.errors,
      bank: result.bank
    });

  } catch (error) {
    console.error('Error al procesar archivo:', error);
    
    // Limpiar archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Error al procesar el archivo',
      message: error.message 
    });
  }
});

// Función para analizar automáticamente la estructura del CSV
function analyzeCSVStructure(data) {
  if (!data || data.length === 0) {
    throw new Error('El archivo CSV está vacío');
  }

  // Buscar la fila de encabezados que contenga las columnas de datos
  let headerRowIndex = -1;
  let headers = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowValues = Object.values(row);
    
    // Buscar fila que contenga "Fecha" y "Importe" o "Saldo"
    if (rowValues.some(val => 
      val && typeof val === 'string' && 
      (val.toLowerCase().includes('fecha') || val.toLowerCase().includes('date'))
    ) && rowValues.some(val => 
      val && typeof val === 'string' && 
      (val.toLowerCase().includes('importe') || val.toLowerCase().includes('amount') || val.toLowerCase().includes('saldo') || val.toLowerCase().includes('balance'))
    )) {
      headerRowIndex = i;
      headers = Object.keys(row);
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('No se pudo encontrar la fila de encabezados con las columnas requeridas');
  }

  // Mapear las columnas encontradas
  const columnMapping = {
    fecha: null,
    concepto: null,
    importe: null,
    balance: null
  };

  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase();
    
    if (headerLower.includes('fecha') || headerLower.includes('date')) {
      columnMapping.fecha = header;
    } else if (headerLower.includes('descripción') || headerLower.includes('concepto') || headerLower.includes('description')) {
      columnMapping.concepto = header;
    } else if (headerLower.includes('importe') || headerLower.includes('amount')) {
      columnMapping.importe = header;
    } else if (headerLower.includes('saldo') || headerLower.includes('balance')) {
      columnMapping.balance = header;
    }
  });

  // Verificar que se encontraron las columnas necesarias
  const missingColumns = Object.entries(columnMapping)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingColumns.length > 0) {
    throw new Error(`No se pudieron encontrar las siguientes columnas: ${missingColumns.join(', ')}`);
  }

  return {
    headerRowIndex,
    columnMapping,
    data: data.slice(headerRowIndex + 1) // Datos sin encabezados
  };
}

// Función para parsear importes en formato español (1.234,56 €)
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Remover símbolos de moneda y espacios
  let cleanAmount = amountStr.toString().replace(/[€$£¥]/g, '').replace(/\s/g, '');
  
  // Si contiene coma, es formato español (1.234,56)
  if (cleanAmount.includes(',')) {
    // Remover puntos de miles y cambiar coma por punto decimal
    cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
  }
  
  const amount = parseFloat(cleanAmount);
  return isNaN(amount) ? 0 : amount;
}

// Función para parsear fechas en diferentes formatos
function parseDate(dateValue) {
  if (!dateValue) return { date: null, time: '00:00' };
  
  // Si es un número (días desde 1900), convertir a fecha
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000);
    return {
      date: date.toISOString().split('T')[0],
      time: '00:00'
    };
  }
  
  // Si es string, intentar parsear
  const dateStr = String(dateValue).trim();
  let datePart, timePart = '00:00';
  
  // Formato dd/mm/yyyy hh:mm
  if (/^\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{1,2}/.test(dateStr)) {
    [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/');
    return {
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      time: timePart
    };
  }
  
  // Formato dd/mm/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
    datePart = dateStr;
    const [day, month, year] = datePart.split('/');
    return {
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      time: '00:00'
    };
  }
  
  // Formato yyyy-mm-dd
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
    return {
      date: dateStr,
      time: '00:00'
    };
  }
  
  // Intentar parsear con Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return {
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().substring(0, 5)
    };
  }
  
  return { date: null, time: '00:00' };
}

module.exports = router;
