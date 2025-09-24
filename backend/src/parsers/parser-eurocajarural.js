// Parser específico para archivos CSV de Eurocaja Rural
// Transforma el formato específico de Eurocaja Rural al formato estándar de la aplicación

const csv = require('csv-parser');
const fs = require('fs');

/**
 * Parser para archivos CSV de Eurocaja Rural
 * Formato detectado:
 * - Fila 10: Fecha de ejecución, Fecha valor, Descripción, Importe, Saldo
 * - Datos desde fila 11 en adelante
 */
class EurocajaRuralParser {
  constructor() {
    console.log('🏦 Inicializando parser de Eurocaja Rural...');
    this.bankName = 'Eurocaja Rural';
    this.expectedColumns = ['Fecha de ejecución', 'Fecha valor', 'Descripción', 'Importe', 'Saldo'];
    console.log('✅ Parser de Eurocaja Rural inicializado');
  }

  // Se eliminó la detección automática de banco

  /**
   * Parsea el archivo CSV de Eurocaja Rural
   * @param {string} filePath - Ruta del archivo CSV
   * @returns {Promise<Array>} - Array de transacciones en formato estándar
   */
  async parseFile(filePath) {
    return new Promise((resolve, reject) => {
      const transactions = new Set(); // Usar Set para evitar duplicados
      let dataStartLine = -1;
      let lineNumber = 0;

      // Leer el archivo línea por línea para encontrar la sección de datos
      const lines = [];
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      
      stream.on('data', (chunk) => {
        const chunkLines = chunk.split('\n');
        lines.push(...chunkLines);
      });
      
      stream.on('end', () => {
        // Buscar la línea que contiene los encabezados de datos
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes('Fecha de ejecución') && line.includes('Descripción') && line.includes('Importe')) {
            dataStartLine = i;
            console.log(`✅ Encabezados encontrados en línea ${i + 1}`);
            break;
          }
        }
        
        if (dataStartLine === -1) {
          console.log('❌ No se encontraron encabezados de datos');
          resolve([...transactions]);
          return;
        }
        
        // Procesar las líneas de datos
        for (let i = dataStartLine + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Saltar líneas vacías
          
          try {
            const transaction = this.parseTransactionLine(line, i + 1);
            if (transaction) {
              // Crear una clave única para cada transacción
              const transactionKey = `${transaction.fecha}-${transaction.concepto}-${transaction.importe}`;
              transactions.add(JSON.stringify({...transaction, key: transactionKey}));
            }
          } catch (error) {
            console.warn(`Error procesando línea ${i + 1}:`, error.message);
          }
        }
        
        // Convertir el Set de nuevo a un array de transacciones
        const uniqueTransactions = [...transactions].map(t => {
          const parsed = JSON.parse(t);
          delete parsed.key;
          return parsed;
        });
        
        console.log(`Eurocaja Rural: Procesadas ${uniqueTransactions.length} transacciones únicas`);
        resolve(uniqueTransactions);
      });
      
      stream.on('error', reject);
    });
  }

  /**
   * Parsea una línea de transacción directamente
   * @param {string} line - Línea del CSV
   * @param {number} lineNumber - Número de línea para errores
   * @returns {Object|null} - Transacción en formato estándar o null si no es válida
   */
  parseTransactionLine(line, lineNumber) {
    try {
      console.log(`\nAnalizando línea ${lineNumber}:`, line);
      
      // Dividir la línea por punto y coma
      const parts = line.split(';');
      
      if (parts.length < 5) {
        console.warn(`Línea ${lineNumber}: No tiene suficientes columnas (${parts.length})`);
        return null;
      }
      
      const fechaEjecucion = parts[0]?.trim();
      const fechaValor = parts[1]?.trim();
      const descripcion = parts[2]?.trim();
      const importe = parts[3]?.trim();
      const saldo = parts[4]?.trim();

      console.log('Datos extraídos:', {
        fechaEjecucion,
        fechaValor,
        descripcion,
        importe,
        saldo
      });

      // Validar datos requeridos
      if (!fechaEjecucion || !descripcion || !importe) {
        console.warn(`Línea ${lineNumber}: Faltan datos requeridos`);
        return null;
      }

      // Parsear fecha (usar fecha de ejecución como principal)
      const fecha = this.parseDate(fechaEjecucion);
      if (!fecha) {
        console.warn(`Línea ${lineNumber}: Fecha inválida: ${fechaEjecucion}`);
        return null;
      }

      // Parsear importe (formato español: -24,15 €)
      const importeParsed = this.parseAmount(importe);
      if (importeParsed === null) {
        console.warn(`Línea ${lineNumber}: Importe inválido: ${importe}`);
        return null;
      }

      // Parsear saldo (formato español: 1.956,02 €)
      const saldoParsed = this.parseAmount(saldo) || 0;

      // Limpiar descripción
      const concepto = this.cleanDescription(descripcion);

      const fechaParsed = this.parseDate(fechaEjecucion);
      const fechaValorParsed = this.parseDate(fechaValor);
      
      return {
        fecha: fechaParsed.date,
        hora: fechaParsed.time,
        concepto: concepto,
        importe: importeParsed,
        balance: saldoParsed,
        banco: this.bankName,
        fechaValor: fechaValorParsed.date || fechaParsed.date
      };

    } catch (error) {
      console.warn(`Error procesando línea ${lineNumber}:`, error.message);
      return null;
    }
  }


  /**
   * Parsea fechas en formato dd/mm/yyyy o dd/mm/yyyy hh:mm
   * @param {string} dateStr - String de fecha
   * @returns {string|null} - Fecha en formato YYYY-MM-DD o null si es inválida
   */
  parseDate(dateStr) {
    if (!dateStr) return { date: null, time: '00:00' };
    
    const cleanDate = String(dateStr).trim();
    console.log('Parseando fecha:', { original: dateStr, limpia: cleanDate });
    
    // Formato dd/mm/yyyy hh:mm o dd-mm-yyyy hh:mm
    const fullRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/;
    const match = cleanDate.match(fullRegex);
    
    if (match) {
      const [_, day, month, year, hours, minutes] = match;
      const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const time = hours && minutes ? `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}` : '00:00';
      
      console.log('Fecha y hora parseadas:', { day, month, year, hours, minutes, resultado: { date, time } });
      return { date, time };
    }
    
    return { date: null, time: '00:00' };
  }

  /**
   * Parsea importes en formato español (1.234,56 €)
   * @param {string} amountStr - String de importe
   * @returns {number|null} - Importe como número o null si es inválido
   */
  parseAmount(amountStr) {
    if (!amountStr) return null;
    
    // Remover símbolos de moneda y espacios
    let cleanAmount = amountStr.toString().replace(/[€$£¥]/g, '').replace(/\s/g, '');
    
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
      .replace(/\s+/g, ' ') // Normalizar espacios
      .replace(/TJ\*{4,}\d+/g, 'TJ****') // Normalizar números de tarjeta
      .replace(/\s+\d{2}\/\d{2}\/\d{2,4}/g, '') // Remover fechas al final
      .trim();
  }
}

module.exports = EurocajaRuralParser;
