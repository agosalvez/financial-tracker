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
  
  // Usar el parser específico del banco si está disponible y soporta el formato
  const parser = parserManager.getParserByBankId(bankId);
  if (parser && parser.supportsFileFormat(file.path)) {
    // Usar el parser específico del banco (soporta CSV y Excel según el parser)
    console.log(`🔄 Usando parser específico de ${parser.bankName} para procesar ${fileExtension}`);
    parseResult = await parserManager.parseFile(file.path, bankId);
  } else if (fileExtension === '.csv') {
    // Fallback: Parsear archivo CSV genérico si no hay parser específico
    console.log('⚠️ Usando parser genérico para CSV');
    parseResult = await parserManager.parseFile(file.path, bankId);
  } else {
    // Fallback: Parsear archivo Excel genérico si no hay parser específico
    console.log('⚠️ Usando parser genérico para Excel');
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

  // Paso 1: Identificar conceptos únicos en el archivo
  const uniqueConcepts = new Map();
  for (const transaction of parseResult.transactions) {
    if (!transaction.concepto) continue;
    
    const conceptoKey = transaction.concepto.trim().toLowerCase();
    if (!uniqueConcepts.has(conceptoKey)) {
      uniqueConcepts.set(conceptoKey, {
        concepto: transaction.concepto,
        importe: transaction.importe, // Tomamos el primer importe como referencia
        count: 0
      });
    }
    uniqueConcepts.get(conceptoKey).count++;
  }

  console.log(`\n📊 Conceptos únicos encontrados: ${uniqueConcepts.size}`);
  
  // Paso 2: Verificar qué conceptos ya están categorizados en la BD
  const conceptCategories = new Map(); // Mapa de concepto -> categoría
  const newConcepts = [];
  
  for (const [conceptoKey, conceptData] of uniqueConcepts.entries()) {
    // Verificar si ya está categorizado
    const savedCategorization = db.prepare(`
      SELECT cc.*, c.nombre as category_name, c.tipo as category_type
      FROM concept_categories cc
      JOIN categories c ON c.id = cc.category_id
      WHERE LOWER(TRIM(cc.concepto)) = ?
      AND (
        (? > 0 AND c.tipo = 'ingreso') OR 
        (? < 0 AND c.tipo = 'gasto')
      )
      ORDER BY cc.confidence DESC, cc.created_at DESC
      LIMIT 1
    `).get(conceptoKey, conceptData.importe, conceptData.importe);

    if (savedCategorization) {
      // Ya existe en BD, usar esa categoría
      conceptCategories.set(conceptoKey, {
        category_id: savedCategorization.category_id,
        category_name: savedCategorization.category_name,
        category_type: savedCategorization.category_type,
        confidence: savedCategorization.confidence,
        source: 'database'
      });
      console.log(`  ✅ Concepto conocido: "${conceptData.concepto}" -> ${savedCategorization.category_name}`);
    } else {
      // Es un concepto nuevo, añadirlo a la lista para categorizar con IA
      newConcepts.push(conceptData);
      console.log(`  🆕 Concepto nuevo: "${conceptData.concepto}" (${conceptData.count} veces)`);
    }
  }

  // Paso 3: Categorizar conceptos nuevos con OpenAI
  let openAICallsCount = 0; // Contador de llamadas a OpenAI
  if (newConcepts.length > 0) {
    console.log(`\n🤖 Categorizando ${newConcepts.length} conceptos nuevos con OpenAI...\n`);
    
    for (const conceptData of newConcepts) {
      try {
        console.log(`🤖 Analizando: "${conceptData.concepto}"`);
        const categorization = await categorizeTransaction(conceptData.concepto, conceptData.importe);
        
        // Incrementar contador solo si se hizo una llamada real a OpenAI (source: 'ai')
        if (categorization.source === 'ai') {
          openAICallsCount++;
        }
        
        // Obtener nombre de la categoría
        const category = db.prepare('SELECT nombre, tipo FROM categories WHERE id = ?').get(categorization.category_id);
        
        if (category) {
          conceptCategories.set(conceptData.concepto.trim().toLowerCase(), {
            category_id: categorization.category_id,
            category_name: category.nombre,
            category_type: category.tipo,
            confidence: categorization.confidence || 0.5,
            source: categorization.source || 'ai'
          });
          console.log(`  ✅ Categorizado: "${conceptData.concepto}" -> ${category.nombre} (confianza: ${((categorization.confidence || 0.5) * 100).toFixed(1)}%)`);
        } else {
          // Fallback a "Otros"
          const otrosCategory = db.prepare('SELECT id, nombre, tipo FROM categories WHERE nombre = ?').get('Otros');
          if (otrosCategory) {
            conceptCategories.set(conceptData.concepto.trim().toLowerCase(), {
              category_id: otrosCategory.id,
              category_name: otrosCategory.nombre,
              category_type: otrosCategory.tipo,
              confidence: 0.5,
              source: 'fallback'
            });
            console.log(`  ⚠️ Usando categoría "Otros" para: "${conceptData.concepto}"`);
          }
        }
        
        // Pausa para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`  ❌ Error categorizando "${conceptData.concepto}":`, error.message);
        // Fallback a "Otros"
        const otrosCategory = db.prepare('SELECT id, nombre, tipo FROM categories WHERE nombre = ?').get('Otros');
        if (otrosCategory) {
          conceptCategories.set(conceptData.concepto.trim().toLowerCase(), {
            category_id: otrosCategory.id,
            category_name: otrosCategory.nombre,
            category_type: otrosCategory.tipo,
            confidence: 0.5,
            source: 'fallback'
          });
        }
      }
    }
  }

  // Paso 4: Procesar todas las transacciones usando las categorías ya determinadas
  console.log(`\n💾 Insertando ${totalTransactions} transacciones en la base de datos...\n`);

  for (const [index, transaction] of parseResult.transactions.entries()) {
    const currentNumber = index + 1;
    if (index % 10 === 0 || index === 0) {
      console.log(`[${currentNumber}/${totalTransactions}] Procesando transacciones...`);
    }
    
    try {
      if (!transaction.fecha || !transaction.concepto) {
        throw new Error('Fecha y concepto son obligatorios');
      }

      // Usar la categoría ya determinada para este concepto
      const conceptoKey = transaction.concepto.trim().toLowerCase();
      const categoryData = conceptCategories.get(conceptoKey);
      
      let category;
      if (categoryData) {
        category = {
          nombre: categoryData.category_name,
          tipo: categoryData.category_type
        };
      } else {
        // Fallback si por alguna razón no se encontró la categoría
        console.warn(`⚠️ No se encontró categoría para "${transaction.concepto}", usando "Otros"`);
        category = db.prepare('SELECT nombre, tipo FROM categories WHERE nombre = ?').get('Otros');
        if (!category) {
          category = { nombre: 'Otros', tipo: transaction.importe > 0 ? 'ingreso' : 'gasto' };
        }
      }

      try {
        // Obtener el nombre del banco (no el ID)
        const bancoName = transaction.banco || parseResult.bank || 'Desconocido';
        
        insertStatement.run(
          transaction.fecha,
          transaction.hora,
          transaction.concepto,
          transaction.importe,
          transaction.balance,
          category.nombre,
          bancoName // Guardar nombre del banco, no el ID
        );
        importedCount++;
      } catch (error) {
        console.error('Error insertando transacción:', error);
        errors.push(`Error en transacción ${transaction.concepto}: ${error.message}`);
      }

      // No necesitamos pausa aquí ya que las categorizaciones se hicieron antes

    } catch (error) {
      errors.push(`Error en transacción: ${error.message}`);
    }
  }

  // Resumen final
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ IMPORTACIÓN COMPLETADA`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📊 Transacciones procesadas: ${importedCount}/${totalTransactions}`);
  console.log(`📋 Conceptos únicos encontrados: ${uniqueConcepts.size}`);
  console.log(`✅ Conceptos ya categorizados: ${uniqueConcepts.size - newConcepts.length}`);
  console.log(`🆕 Conceptos nuevos encontrados: ${newConcepts.length}`);
  console.log(`🤖 Llamadas a OpenAI realizadas: ${openAICallsCount}`);
  if (errors.length > 0) {
    console.log(`❌ Errores encontrados: ${errors.length}`);
  }
  console.log(`${'='.repeat(60)}\n`);

  return {
    count: importedCount,
    errors: errors.length > 0 ? errors : undefined,
    bank: parseResult.bank,
    stats: {
      totalTransactions: totalTransactions,
      uniqueConcepts: uniqueConcepts.size,
      newConcepts: newConcepts.length,
      openAICalls: openAICallsCount
    }
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

    console.log('📋 Solicitando lista de bancos soportados...');
    const banks = parserManager.getSupportedBanks();
    console.log('✅ Bancos a enviar al frontend:', JSON.stringify(banks, null, 2));
    
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
/**
 * @swagger
 * /api/upload/detect:
 *   post:
 *     summary: Detecta automáticamente el banco de un archivo
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
 *     responses:
 *       200:
 *         description: Banco detectado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 detected:
 *                   type: boolean
 *                 bankId:
 *                   type: string
 *                 bankName:
 *                   type: string
 *                 confidence:
 *                   type: number
 *                 reason:
 *                   type: string
 */
router.post('/detect', upload.single('files'), async (req, res) => {
  try {
    if (!parserManager) {
      throw new Error('Sistema de parsers no disponible');
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const detection = await parserManager.detectBank(req.file.path);

    // Limpiar archivo temporal
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (detection.parser) {
      res.json({
        detected: true,
        bankId: detection.parser.getBankId(),
        bankName: detection.parser.bankName,
        confidence: detection.confidence,
        reason: detection.reason,
        alternatives: detection.alternatives || []
      });
    } else {
      res.json({
        detected: false,
        confidence: 0,
        reason: detection.reason
      });
    }

  } catch (error) {
    console.error('Error detectando banco:', error);
    
    // Limpiar archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Error detectando banco',
      message: error.message 
    });
  }
});

router.post('/', upload.single('files'), async (req, res) => {
  try {
    if (!parserManager) {
      throw new Error('Sistema de parsers no disponible');
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    // Si no se proporciona bankId, intentar detectar automáticamente
    let bankId = req.body.bankId;
    
    if (!bankId) {
      console.log('🔄 No se especificó banco, intentando detección automática...');
      const detection = await parserManager.detectBank(req.file.path);
      
      if (detection.parser && detection.confidence >= 0.5) {
        bankId = detection.parser.getBankId();
        console.log(`✅ Banco detectado automáticamente: ${detection.parser.bankName} (${(detection.confidence * 100).toFixed(1)}% confianza)`);
      } else {
        return res.status(400).json({ 
          error: 'Es necesario seleccionar un banco',
          message: 'No se pudo detectar el banco automáticamente. Por favor, selecciona el banco manualmente.'
        });
      }
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
