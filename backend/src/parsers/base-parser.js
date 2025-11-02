/**
 * Clase base abstracta para todos los parsers de bancos
 * Define la interfaz común que todos los parsers deben implementar
 * Aplica principios SOLID: Single Responsibility, Open/Closed, Liskov Substitution
 */

class BaseParser {
  constructor(bankName, supportedFormats = ['csv']) {
    if (this.constructor === BaseParser) {
      throw new Error('BaseParser es una clase abstracta y no puede ser instanciada directamente');
    }

    if (!bankName) {
      throw new Error('bankName es requerido');
    }

    this.bankName = bankName;
    this.supportedFormats = Array.isArray(supportedFormats) ? supportedFormats : [supportedFormats];
    this.metadata = this.initializeMetadata();
  }

  /**
   * Inicializa los metadatos del parser
   * Cada parser puede sobrescribir este método para definir sus propios metadatos
   * @returns {Object} - Metadatos del parser
   */
  initializeMetadata() {
    return {
      description: this.getDefaultDescription(),
      supportedFileExtensions: this.supportedFormats,
      version: '1.0.0'
    };
  }

  /**
   * Obtiene la descripción por defecto del parser
   * Cada parser puede sobrescribir este método
   * @returns {string}
   */
  getDefaultDescription() {
    const formats = this.supportedFormats.join(', ').toUpperCase();
    return `Parser para archivos ${formats} de ${this.bankName}`;
  }

  /**
   * Método abstracto que debe ser implementado por cada parser
   * Parsea el archivo y retorna un array de transacciones
   * @param {string} filePath - Ruta del archivo a parsear
   * @returns {Promise<Array>} - Array de transacciones en formato estándar
   * @throws {Error} - Debe ser implementado por las clases hijas
   */
  async parseFile(filePath) {
    throw new Error('parseFile debe ser implementado por las clases hijas');
  }

  /**
   * Valida que el archivo sea del formato soportado
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean} - true si el formato es soportado
   */
  supportsFileFormat(filePath) {
    if (!filePath) return false;
    
    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    
    // Mapeo de extensiones a formatos
    const formatMap = {
      '.csv': 'csv',
      '.xls': 'excel',
      '.xlsx': 'excel'
    };

    const fileFormat = formatMap[extension];
    return this.supportedFormats.includes(fileFormat);
  }

  /**
   * Obtiene el ID único del banco (para uso en URLs y APIs)
   * @returns {string}
   */
  getBankId() {
    return this.bankName.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Obtiene los metadatos completos del parser
   * @returns {Object}
   */
  getMetadata() {
    return {
      id: this.getBankId(),
      name: this.bankName,
      ...this.metadata
    };
  }

  /**
   * Normaliza el nombre del banco para uso interno
   * @returns {string}
   */
  getNormalizedBankName() {
    return this.bankName.trim();
  }

  /**
   * Detecta si un archivo pertenece a este banco
   * Cada parser puede sobrescribir este método para implementar su lógica de detección
   * @param {string} filePath - Ruta del archivo a analizar
   * @returns {Promise<{detected: boolean, confidence: number, reason?: string}>}
   *   - detected: true si se detecta que el archivo es de este banco
   *   - confidence: nivel de confianza (0-1)
   *   - reason: razón de la detección (opcional)
   */
  async detect(filePath) {
    // Implementación por defecto: no detecta nada
    // Cada parser debe sobrescribir este método
    return {
      detected: false,
      confidence: 0,
      reason: 'Detección no implementada para este parser'
    };
  }
}

module.exports = BaseParser;


