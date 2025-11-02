// Parser específico para archivos Excel/CSV de ING Direct
// Transforma el formato específico de ING Direct al formato estándar de la aplicación

const XLSX = require('xlsx');
const fs = require('fs');
const csv = require('csv-parser');
const BaseParser = require('./base-parser');

/**
 * Parser para archivos de ING Direct
 * Soporta formatos Excel (.xls, .xlsx) y CSV
 * Detecta automáticamente la estructura del archivo
 */
class INGDirectParser extends BaseParser {
  constructor() {
    super('ING Direct', ['csv', 'excel']);
    console.log('🏦 Inicializando parser de ING Direct...');
    this.expectedColumns = ['Fecha', 'Concepto', 'Descripción', 'Importe', 'Saldo'];
    console.log('✅ Parser de ING Direct inicializado');
  }

  /**
   * Sobrescribe el método para definir la descripción específica
   * @returns {string}
   */
  getDefaultDescription() {
    return `Parser para archivos Excel y CSV de ${this.bankName}`;
  }

  /**
   * Detecta si un archivo es de ING Direct
   * Analiza la estructura del archivo para identificar características de ING Direct
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<{detected: boolean, confidence: number, reason?: string}>}
   */
  async detect(filePath) {
    try {
      const fileExtension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
      let data = [];
      let sheet = null;

      if (['.xls', '.xlsx'].includes(fileExtension)) {
        // Analizar Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      } else if (fileExtension === '.csv') {
        // Para CSV, leer las primeras líneas
        return new Promise((resolve) => {
          const lines = [];
          fs.createReadStream(filePath, { encoding: 'utf8' })
            .on('data', (chunk) => {
              lines.push(...chunk.split('\n').slice(0, 20)); // Primeras 20 líneas
            })
            .on('end', () => {
              // Analizar líneas CSV
              data = lines.map(line => line.split(/[;,\t]/).map(cell => cell.trim()));
              const result = this.analyzeForINGDirect(data);
              resolve(result);
            })
            .on('error', () => {
              resolve({ detected: false, confidence: 0, reason: 'Error leyendo archivo CSV' });
            });
        });
      } else {
        return { detected: false, confidence: 0, reason: 'Formato no soportado' };
      }

      return this.analyzeForINGDirect(data);

    } catch (error) {
      console.warn(`⚠️ Error detectando ING Direct en ${filePath}:`, error.message);
      return { detected: false, confidence: 0, reason: `Error: ${error.message}` };
    }
  }

  /**
   * Analiza los datos para identificar características de ING Direct
   * @param {Array<Array>} data - Matriz de datos del archivo
   * @returns {{detected: boolean, confidence: number, reason?: string}}
   */
  analyzeForINGDirect(data) {
    let score = 0;
    const reasons = [];

    // Buscar en las primeras 30 filas
    for (let i = 0; i < Math.min(30, data.length); i++) {
      const row = data[i];
      const rowLower = row.map(cell => String(cell || '').toLowerCase().trim()).join(' ');

      // Indicadores específicos de ING Direct
      
      // 1. Encabezado característico: "F. VALOR", "DESCRIPCIÓN", "IMPORTE (€)", "SALDO (€)"
      if (row.some(cell => /^f\.?\s*valor$/i.test(String(cell).trim()))) {
        if (row.some(cell => /^descripci[oó]n$/i.test(String(cell).trim()))) {
          if (row.some(cell => /importe.*€|€.*importe/i.test(String(cell)))) {
            score += 0.8;
            reasons.push('Encabezados característicos de ING Direct encontrados');
            break;
          }
        }
      }

      // 2. Buscar texto "ING" en las primeras filas
      if (row.some(cell => /ing\s*(direct|bank)/i.test(String(cell)))) {
        score += 0.3;
        reasons.push('Menciones de ING en el archivo');
      }

      // 3. Estructura de columnas: F. VALOR (número), CATEGORÍA, SUBCATEGORÍA, DESCRIPCIÓN, IMPORTE, SALDO
      const numColumns = row.filter(cell => cell && String(cell).trim()).length;
      if (i === 4 && numColumns >= 7) {
        // Fila 4-5 típicamente tiene 8 columnas en ING Direct
        const firstValue = row[0];
        // La primera columna puede ser un número (fecha Excel)
        if (firstValue && /^\d{5,6}$/.test(String(firstValue).trim())) {
          score += 0.2;
          reasons.push('Estructura de columnas compatible con ING Direct');
        }
      }
    }

    const detected = score >= 0.5;
    const confidence = Math.min(score, 1.0);

    return {
      detected,
      confidence,
      reason: detected ? reasons.join('; ') : 'No se encontraron indicadores suficientes de ING Direct'
    };
  }

  /**
   * Parsea el archivo de ING Direct (Excel o CSV)
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Array>} - Array de transacciones en formato estándar
   */
  async parseFile(filePath) {
    const fileExtension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    
    if (['.xls', '.xlsx'].includes(fileExtension)) {
      return this.parseExcelFile(filePath);
    } else if (fileExtension === '.csv') {
      return this.parseCSVFile(filePath);
    } else {
      throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
    }
  }

  /**
   * Parsea un archivo Excel de ING Direct
   * @param {string} filePath - Ruta del archivo Excel
   * @returns {Promise<Array>} - Array de transacciones
   */
  async parseExcelFile(filePath) {
    return new Promise((resolve, reject) => {
      try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Leer como matriz de datos
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        console.log(`📄 Archivo Excel: ${data.length} filas encontradas`);
        
        // Buscar la fila de encabezados
        const headerRowIndex = this.findHeaderRow(data);
        
        if (headerRowIndex === -1) {
          console.warn('⚠️ No se encontró fila de encabezados, usando primera fila');
          const transactions = this.parseDataRows(data, 0, data[0]);
          resolve(transactions);
          return;
        }
        
        console.log(`✅ Encabezados encontrados en fila ${headerRowIndex + 1}`);
        const headers = data[headerRowIndex];
        console.log('📋 Columnas detectadas:', headers.filter(h => h).join(', '));
        
        // Parsear las filas de datos
        const transactions = this.parseDataRows(data, headerRowIndex + 1, headers);
        
        console.log(`✅ Procesadas ${transactions.length} transacciones de ING Direct`);
        resolve(transactions);
        
      } catch (error) {
        console.error('❌ Error parseando archivo Excel:', error);
        reject(error);
      }
    });
  }

  /**
   * Parsea un archivo CSV de ING Direct
   * @param {string} filePath - Ruta del archivo CSV
   * @returns {Promise<Array>} - Array de transacciones
   */
  async parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const transactions = [];
      let headers = [];
      let headerFound = false;
      let lineNumber = 0;

      fs.createReadStream(filePath, { encoding: 'utf8' })
        .on('error', reject)
        .pipe(csv({ 
          separator: ';',
          headers: false,
          skipEmptyLines: true
        }))
        .on('data', (row) => {
          lineNumber++;
          const rowArray = Object.values(row);
          
          // Buscar fila de encabezados si no se ha encontrado
          if (!headerFound && this.isHeaderRow(rowArray)) {
            headers = rowArray;
            headerFound = true;
            console.log(`✅ Encabezados CSV encontrados en línea ${lineNumber}`);
            console.log('📋 Columnas:', headers.filter(h => h).join(', '));
            return;
          }
          
          // Si ya tenemos headers, parsear la fila
          if (headerFound && headers.length > 0) {
            const transaction = this.parseTransactionRow(rowArray, headers, lineNumber);
            if (transaction) {
              transactions.push(transaction);
            }
          }
        })
        .on('end', () => {
          console.log(`✅ Procesadas ${transactions.length} transacciones CSV de ING Direct`);
          resolve(transactions);
        })
        .on('error', reject);
    });
  }

  /**
   * Encuentra la fila que contiene los encabezados
   * @param {Array} data - Matriz de datos
   * @returns {number} - Índice de la fila de encabezados o -1 si no se encuentra
   */
  findHeaderRow(data) {
    // Buscar en las primeras 20 filas
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i].map(cell => String(cell || '').toLowerCase().trim());
      const rowStr = row.join(' ');
      
      // Buscar indicadores de encabezado
      if (this.isHeaderRow(row)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Determina si una fila es una fila de encabezados
   * @param {Array} row - Fila de datos
   * @returns {boolean}
   */
  isHeaderRow(row) {
    const rowLower = row.map(cell => String(cell || '').toLowerCase().trim()).join(' ');
    
    // Buscar palabras clave de ING Direct (más flexibles)
    // ING Direct usa "F. VALOR" para fecha y "DESCRIPCIÓN" para concepto
    const hasFecha = /f\.?\s*valor|fecha|date|valor/.test(rowLower);
    const hasConcepto = /concepto|descripci[oó]n|descripcion|detalle|movimiento/.test(rowLower);
    const hasImporte = /importe|amount|cantidad|monto|€/.test(rowLower);
    
    // Para ING Direct, necesitamos fecha y concepto como mínimo
    // El importe puede estar junto con el símbolo €
    return hasFecha && hasConcepto && hasImporte;
  }

  /**
   * Parsea las filas de datos en transacciones
   * @param {Array} data - Matriz de datos completa
   * @param {number} startIndex - Índice desde el cual empezar a parsear
   * @param {Array} headers - Array con los nombres de las columnas
   * @returns {Array} - Array de transacciones
   */
  parseDataRows(data, startIndex, headers) {
    const transactions = [];
    const transactionsSet = new Set(); // Para evitar duplicados
    
    // Mapear nombres de columnas a índices
    const columnMap = this.mapColumns(headers);
    
    console.log('🗺️ Mapeo de columnas:', JSON.stringify(columnMap, null, 2));
    
    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      
      // Saltar filas vacías
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }
      
      try {
        const transaction = this.parseTransactionRow(row, headers, i + 1, columnMap);
        
        if (transaction) {
          // Crear clave única para evitar duplicados
          const uniqueKey = `${transaction.fecha}-${transaction.concepto}-${transaction.importe}`;
          
          if (!transactionsSet.has(uniqueKey)) {
            transactionsSet.add(uniqueKey);
            transactions.push(transaction);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error procesando fila ${i + 1}:`, error.message);
      }
    }
    
    return transactions;
  }

  /**
   * Mapea los nombres de columnas a índices
   * @param {Array} headers - Array con nombres de columnas
   * @returns {Object} - Objeto con mapeo de nombre -> índice
   */
  mapColumns(headers) {
    const map = {};
    
    headers.forEach((header, index) => {
      const headerStr = String(header || '').trim();
      const headerLower = headerStr.toLowerCase();
      
      // Fecha - ING Direct usa "F. VALOR" o "F VALOR"
      if (!map.fecha) {
        if (/^f\.?\s*valor$/i.test(headerStr) || /fecha|date/i.test(headerStr)) {
          map.fecha = index;
        } else if (/^[\d]{1,2}\/[\d]{1,2}\/[\d]{4}/.test(headerStr)) {
          map.fecha = index;
        }
      }
      
      // Concepto/Descripción - ING Direct usa "DESCRIPCIÓN"
      if (!map.concepto && /^descripci[oó]n|concepto|detalle|movimiento|asunto/i.test(headerStr)) {
        map.concepto = index;
      }
      
      // Importe - ING Direct usa "IMPORTE (€)" o "IMPORTE"
      if (!map.importe && /importe|amount|cantidad|monto/i.test(headerLower)) {
        // Preferir la columna que tenga el símbolo € si hay varias
        if (/importe.*€|€.*importe/i.test(headerStr) || !map.importe) {
          map.importe = index;
        }
      }
      
      // Saldo/Balance - ING Direct usa "SALDO (€)"
      if (!map.balance && /saldo|balance/i.test(headerLower)) {
        map.balance = index;
      }
    });
    
    console.log('🔍 Headers analizados:', headers.map((h, i) => `${i}: "${h}"`).join(', '));
    console.log('🗺️ Mapeo resultante:', JSON.stringify(map, null, 2));
    
    return map;
  }

  /**
   * Parsea una fila de datos en una transacción
   * @param {Array} row - Fila de datos
   * @param {Array} headers - Array con nombres de columnas (opcional si se usa columnMap)
   * @param {number} lineNumber - Número de línea para logs
   * @param {Object} columnMap - Mapeo de columnas (opcional, se calcula si no se proporciona)
   * @returns {Object|null} - Transacción en formato estándar o null si no es válida
   */
  parseTransactionRow(row, headers, lineNumber, columnMap = null) {
    try {
      // Si no tenemos columnMap, calcularlo
      if (!columnMap) {
        columnMap = this.mapColumns(headers);
      }
      
      // Verificar que tenemos el mapeo mínimo necesario
      if (columnMap.fecha === undefined || columnMap.concepto === undefined || columnMap.importe === undefined) {
        console.warn(`⚠️ Línea ${lineNumber}: Mapeo de columnas incompleto. Fecha: ${columnMap.fecha}, Concepto: ${columnMap.concepto}, Importe: ${columnMap.importe}`);
        return null;
      }
      
      // Obtener valores según el mapeo
      const fechaValue = row[columnMap.fecha];
      const conceptoValue = row[columnMap.concepto];
      const importeValue = row[columnMap.importe];
      const balanceValue = columnMap.balance !== undefined ? row[columnMap.balance] : null;
      
      // Validar datos requeridos
      if (fechaValue === null || fechaValue === undefined || fechaValue === '') {
        console.warn(`⚠️ Línea ${lineNumber}: Fecha vacía`);
        return null;
      }
      
      if (!conceptoValue || conceptoValue === '') {
        console.warn(`⚠️ Línea ${lineNumber}: Concepto vacío`);
        return null;
      }
      
      if (importeValue === null || importeValue === undefined || importeValue === '') {
        console.warn(`⚠️ Línea ${lineNumber}: Importe vacío`);
        return null;
      }
      
      // Parsear fecha (puede ser número de Excel)
      const fechaParsed = this.parseDate(fechaValue);
      if (!fechaParsed.date) {
        console.warn(`⚠️ Línea ${lineNumber}: Fecha inválida: ${fechaValue} (tipo: ${typeof fechaValue})`);
        return null;
      }
      
      // Parsear importe
      const importeParsed = this.parseAmount(String(importeValue));
      if (importeParsed === null) {
        console.warn(`⚠️ Línea ${lineNumber}: Importe inválido: ${importeValue} (tipo: ${typeof importeValue})`);
        return null;
      }
      
      // Parsear saldo
      const balanceParsed = balanceValue ? this.parseAmount(String(balanceValue)) : null;
      
      // Limpiar concepto
      const concepto = this.cleanDescription(String(conceptoValue));
      
      if (!concepto || concepto.trim() === '') {
        console.warn(`⚠️ Línea ${lineNumber}: Concepto vacío después de limpiar`);
        return null;
      }
      
      return {
        fecha: fechaParsed.date,
        hora: fechaParsed.time,
        concepto: concepto,
        importe: importeParsed,
        balance: balanceParsed || 0,
        banco: this.bankName
      };
      
    } catch (error) {
      console.warn(`⚠️ Error procesando línea ${lineNumber}:`, error.message);
      console.warn(`   Stack:`, error.stack);
      return null;
    }
  }

  /**
   * Parsea fechas en diferentes formatos
   * ING Direct usa números de Excel (días desde 1900) en la columna "F. VALOR"
   * @param {string|number} dateValue - String o número de fecha
   * @returns {Object} - Objeto con {date, time} o {date: null, time: '00:00'}
   */
  parseDate(dateValue) {
    if (dateValue === null || dateValue === undefined || dateValue === '') {
      return { date: null, time: '00:00' };
    }
    
    // Si ya es un número (caso común en ING Direct Excel)
    if (typeof dateValue === 'number') {
      // Números de Excel (días desde 1900-01-01)
      // Excel usa el 1 de enero de 1900 como día 1
      // Pero hay un bug: considera 1900 como año bisiesto, así que hay que ajustar
      if (dateValue > 0 && dateValue < 100000) {
        // Convertir días de Excel a fecha
        // Excel epoch: 1900-01-01 (pero considera 1900 bisiesto, así que usamos 1899-12-30)
        const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
        const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 86400 * 1000);
        
        if (!isNaN(date.getTime())) {
          return {
            date: date.toISOString().split('T')[0],
            time: '00:00'
          };
        }
      }
    }
    
    const cleanDate = String(dateValue).trim();
    
    // Si es un número como string (días desde 1900 en Excel)
    if (/^\d+\.?\d*$/.test(cleanDate)) {
      const days = parseFloat(cleanDate);
      if (days > 0 && days < 100000) {
        // Convertir días de Excel a fecha
        const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
        const date = new Date(excelEpoch.getTime() + (days - 1) * 86400 * 1000);
        
        if (!isNaN(date.getTime())) {
          return {
            date: date.toISOString().split('T')[0],
            time: '00:00'
          };
        }
      }
    }
    
    // Formato dd/mm/yyyy
    const ddmmRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
    const ddmmMatch = cleanDate.match(ddmmRegex);
    if (ddmmMatch) {
      const [, day, month, year] = ddmmMatch;
      return {
        date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        time: '00:00'
      };
    }
    
    // Formato yyyy-mm-dd
    const yyyyRegex = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/;
    const yyyyMatch = cleanDate.match(yyyyRegex);
    if (yyyyMatch) {
      const [, year, month, day] = yyyyMatch;
      return {
        date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        time: '00:00'
      };
    }
    
    // Intentar parsear con Date
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      return {
        date: date.toISOString().split('T')[0],
        time: '00:00'
      };
    }
    
    return { date: null, time: '00:00' };
  }

  /**
   * Parsea importes en diferentes formatos
   * @param {string} amountStr - String de importe
   * @returns {number|null} - Importe como número o null si es inválido
   */
  parseAmount(amountStr) {
    if (!amountStr || amountStr === '') return null;
    
    // Remover símbolos de moneda y espacios
    let cleanAmount = String(amountStr).replace(/[€$£¥]/g, '').replace(/\s/g, '');
    
    // Si está vacío después de limpiar, retornar null
    if (!cleanAmount || cleanAmount === '' || cleanAmount === '-') return null;
    
    // Si contiene coma, es formato español (1.234,56)
    if (cleanAmount.includes(',')) {
      // Remover puntos de miles y cambiar coma por punto decimal
      cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
    }
    
    const amount = parseFloat(cleanAmount);
    return isNaN(amount) ? null : amount;
  }

  /**
   * Limpia y normaliza la descripción del movimiento
   * @param {string} description - Descripción original
   * @returns {string} - Descripción limpia
   */
  cleanDescription(description) {
    if (!description) return '';
    
    return String(description)
      .trim()
      .replace(/\s+/g, ' ') // Normalizar espacios múltiples
      .replace(/TJ\*{4,}\d+/g, 'TJ****') // Normalizar números de tarjeta
      .replace(/\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/g, '****') // Normalizar tarjetas completas
      .trim();
  }
}

module.exports = INGDirectParser;

