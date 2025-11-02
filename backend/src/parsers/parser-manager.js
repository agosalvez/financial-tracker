/**
 * Gestor de parsers específicos por banco
 * Aplica principios SOLID:
 * - Single Responsibility: Gestiona parsers y sus operaciones
 * - Open/Closed: Abierto para extensión (nuevos parsers), cerrado para modificación
 * - Dependency Inversion: Depende de abstracciones (BaseParser) no de implementaciones concretas
 */

const fs = require('fs');
const path = require('path');

// Importar parsers desde el índice centralizado
// Esto facilita agregar nuevos parsers sin modificar el ParserManager
const parsersRegistry = require('./index');

class ParserManager {
  constructor(parsers = null) {
    try {
      console.log('🔄 Inicializando ParserManager...');
      // Permite inyectar parsers para testing, o usar el registro por defecto
      this.parsers = parsers || this.initializeParsers();
      console.log('✅ Parsers cargados:', this.parsers.map(p => p.bankName).join(', '));
    } catch (error) {
      console.error('❌ Error inicializando parsers:', error);
      this.parsers = [];
    }
  }

  /**
   * Inicializa todos los parsers disponibles desde el registro centralizado
   * Aplica Open/Closed: nuevos parsers se agregan al índice, sin modificar este método
   * @returns {Array<BaseParser>} - Array de instancias de parsers validados
   */
  initializeParsers() {
    // Usar el registro centralizado de parsers
    const parsers = [...parsersRegistry];

    // Validar que todos los parsers sean válidos
    this.validateParsers(parsers);

    return parsers;
  }

  /**
   * Valida que todos los parsers cumplan con la interfaz requerida
   * @param {Array<BaseParser>} parsers - Array de parsers a validar
   * @throws {Error} - Si algún parser no cumple los requisitos
   */
  validateParsers(parsers) {
    if (!Array.isArray(parsers) || parsers.length === 0) {
      throw new Error('No se encontraron parsers para inicializar');
    }

    parsers.forEach((parser, index) => {
      if (!parser) {
        throw new Error(`Parser en índice ${index} es null o undefined`);
      }

      if (!parser.bankName) {
        throw new Error(`Parser en índice ${index}: falta bankName`);
      }

      if (typeof parser.parseFile !== 'function') {
        throw new Error(`Parser ${parser.bankName} debe implementar el método parseFile`);
      }

      if (typeof parser.getBankId !== 'function') {
        throw new Error(`Parser ${parser.bankName} debe extender BaseParser`);
      }

      // Verificar duplicados por ID
      const bankId = parser.getBankId();
      const duplicates = parsers.filter(p => p && p.getBankId && p.getBankId() === bankId);
      if (duplicates.length > 1) {
        throw new Error(`Parser duplicado: ${bankId} está registrado ${duplicates.length} veces`);
      }
    });
  }

  /**
   * Obtiene la lista de bancos soportados con sus metadatos
   * Aplica Open/Closed: No necesita modificación para nuevos parsers
   * @returns {Array<Object>} - Lista de bancos con metadatos
   */
  getSupportedBanks() {
    console.log('🔄 Obteniendo bancos soportados...');
    console.log('📋 Parsers disponibles:', this.parsers.length);

    const banks = this.parsers.map(parser => {
      const metadata = parser.getMetadata();
      return {
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        supportedFormats: metadata.supportedFileExtensions
      };
    });

    console.log('✅ Bancos encontrados:', banks.map(b => b.name).join(', '));
    return banks;
  }

  /**
   * Obtiene un parser específico por ID de banco
   * @param {string} bankId - ID del banco (normalizado)
   * @returns {BaseParser|null} - Parser encontrado o null
   */
  getParserByBankId(bankId) {
    if (!bankId) {
      console.warn('⚠️ No se proporcionó bankId');
      return null;
    }

    console.log('🔍 Buscando parser para banco:', bankId);
    
    const parser = this.parsers.find(parser => {
      const normalizedId = parser.getBankId();
      return normalizedId === bankId.toLowerCase().trim();
    });
    
    if (parser) {
      console.log('✅ Parser encontrado:', parser.bankName);
    } else {
      console.log('❌ No se encontró parser para:', bankId);
      console.log('📋 Parsers disponibles:', this.parsers.map(p => p.getBankId()).join(', '));
    }
    
    return parser || null;
  }

  /**
   * Obtiene un parser por nombre de banco
   * @param {string} bankName - Nombre del banco
   * @returns {BaseParser|null} - Parser encontrado o null
   */
  getParserByBankName(bankName) {
    if (!bankName) {
      return null;
    }

    return this.parsers.find(parser => 
      parser.getNormalizedBankName().toLowerCase() === bankName.toLowerCase().trim()
    ) || null;
  }

  /**
   * Parsea un archivo usando el parser especificado
   * @param {string} filePath - Ruta del archivo a parsear
   * @param {string} bankId - ID del banco (requerido)
   * @returns {Promise<Object>} - Resultado del parsing con metadatos
   * @throws {Error} - Si el banco no se especifica o no se encuentra
   */
  async parseFile(filePath, bankId) {
    console.log('📄 Procesando archivo para banco:', bankId);

    if (!bankId) {
      const error = new Error('Es necesario especificar el banco');
      console.error('❌', error.message);
      throw error;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      const error = new Error(`Archivo no encontrado: ${filePath}`);
      console.error('❌', error.message);
      throw error;
    }

    const parser = this.getParserByBankId(bankId);
    if (!parser) {
      const error = new Error(`Parser no encontrado para el banco: ${bankId}`);
      console.error('❌', error.message);
      throw error;
    }

    // Validar que el formato del archivo es soportado
    if (!parser.supportsFileFormat(filePath)) {
      const supportedFormats = parser.supportedFormats.join(', ');
      const error = new Error(
        `El archivo no es de un formato soportado por ${parser.bankName}. ` +
        `Formatos soportados: ${supportedFormats}`
      );
      console.error('❌', error.message);
      throw error;
    }

    try {
      console.log('🔄 Iniciando parsing con:', parser.bankName);
      const transactions = await parser.parseFile(filePath);
      console.log(`✅ Parsing completado: ${transactions.length} transacciones`);
      
      return {
        success: true,
        bank: parser.bankName,
        bankId: parser.getBankId(),
        transactions: transactions,
        count: transactions.length,
        metadata: parser.getMetadata()
      };
    } catch (error) {
      console.error(`❌ Error parseando archivo con ${parser.bankName}:`, error);
      throw new Error(`Error procesando archivo de ${parser.bankName}: ${error.message}`);
    }
  }

  /**
   * Obtiene información detallada de un parser específico
   * @param {string} bankId - ID del banco
   * @returns {Object|null} - Metadatos del parser o null si no se encuentra
   */
  getParserInfo(bankId) {
    const parser = this.getParserByBankId(bankId);
    return parser ? parser.getMetadata() : null;
  }

  /**
   * Registra un nuevo parser dinámicamente (útil para testing o extensión)
   * @param {BaseParser} parser - Instancia del parser a registrar
   * @throws {Error} - Si el parser no es válido
   */
  registerParser(parser) {
    if (!parser || typeof parser.parseFile !== 'function') {
      throw new Error('El parser debe ser una instancia que implemente parseFile');
    }

    if (!parser.bankName) {
      throw new Error('El parser debe tener un bankName');
    }

    // Verificar que no existe ya un parser con el mismo ID
    const existingParser = this.getParserByBankId(parser.getBankId());
    if (existingParser) {
      throw new Error(`Ya existe un parser registrado para ${parser.bankName}`);
    }

    this.parsers.push(parser);
    console.log(`✅ Parser ${parser.bankName} registrado correctamente`);
  }

  /**
   * Detecta automáticamente el banco de un archivo
   * Prueba todos los parsers y devuelve el que tenga mayor confianza
   * @param {string} filePath - Ruta del archivo a analizar
   * @returns {Promise<{parser: BaseParser|null, confidence: number, reason?: string}>}
   */
  async detectBank(filePath) {
    console.log('🔍 Detectando banco automáticamente para:', filePath);

    if (!filePath || !fs.existsSync(filePath)) {
      return {
        parser: null,
        confidence: 0,
        reason: 'Archivo no encontrado'
      };
    }

    const detections = [];

    // Probar todos los parsers
    for (const parser of this.parsers) {
      try {
        // Verificar que el formato del archivo sea compatible
        if (!parser.supportsFileFormat(filePath)) {
          continue;
        }

        const result = await parser.detect(filePath);
        
        if (result.detected) {
          detections.push({
            parser,
            confidence: result.confidence,
            reason: result.reason
          });
          console.log(`  ✅ ${parser.bankName}: confianza ${(result.confidence * 100).toFixed(1)}% - ${result.reason}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Error detectando con ${parser.bankName}:`, error.message);
      }
    }

    if (detections.length === 0) {
      console.log('  ❌ No se pudo detectar el banco automáticamente');
      return {
        parser: null,
        confidence: 0,
        reason: 'Ningún parser detectó el archivo con suficiente confianza'
      };
    }

    // Ordenar por confianza (mayor a menor)
    detections.sort((a, b) => b.confidence - a.confidence);

    const best = detections[0];
    console.log(`  🎯 Banco detectado: ${best.parser.bankName} (${(best.confidence * 100).toFixed(1)}% confianza)`);

    return {
      parser: best.parser,
      confidence: best.confidence,
      reason: best.reason,
      alternatives: detections.slice(1).map(d => ({
        bank: d.parser.bankName,
        bankId: d.parser.getBankId(),
        confidence: d.confidence
      }))
    };
  }
}

module.exports = ParserManager;
