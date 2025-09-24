// Gestor de parsers específicos por banco
// Detecta automáticamente el banco y usa el parser correspondiente

const EurocajaRuralParser = require('./parser-eurocajarural');

class ParserManager {
  constructor() {
    try {
      console.log('🔄 Inicializando ParserManager...');
      this.parsers = [
        new EurocajaRuralParser()
      ];
      console.log('✅ Parsers cargados:', this.parsers.map(p => p.bankName).join(', '));
    } catch (error) {
      console.error('❌ Error inicializando parsers:', error);
      this.parsers = [];
    }
  }


  /**
   * Obtiene la lista de bancos soportados
   * @returns {Array} - Lista de bancos disponibles
   */
  getSupportedBanks() {
    console.log('🔄 Obteniendo bancos soportados...');
    console.log('📋 Parsers disponibles:', this.parsers.length);

    const banks = this.parsers.map(parser => ({
      id: parser.bankName.toLowerCase().replace(/\s+/g, '-'),
      name: parser.bankName,
      description: `Parser para archivos CSV de ${parser.bankName}`
    }));

    console.log('✅ Bancos encontrados:', banks.map(b => b.name).join(', '));
    return banks;
  }

  /**
   * Obtiene un parser específico por nombre de banco
   * @param {string} bankId - ID del banco
   * @returns {Object|null} - Parser o null si no existe
   */
  getParserByBankId(bankId) {
    console.log('🔍 Buscando parser para banco:', bankId);
    const parser = this.parsers.find(parser => 
      parser.bankName.toLowerCase().replace(/\s+/g, '-') === bankId
    );
    
    if (parser) {
      console.log('✅ Parser encontrado:', parser.bankName);
    } else {
      console.log('❌ No se encontró parser para:', bankId);
    }
    
    return parser || null;
  }

  /**
   * Parsea un archivo CSV usando el parser especificado
   * @param {string} filePath - Ruta del archivo CSV
   * @param {string} bankId - ID del banco (requerido)
   * @returns {Promise<Object>} - Resultado del parsing
   */
  async parseFile(filePath, bankId) {
    console.log('📄 Procesando archivo para banco:', bankId);

    if (!bankId) {
      console.error('❌ No se especificó el banco');
      throw new Error('Es necesario especificar el banco');
    }

    const parser = this.getParserByBankId(bankId);
    if (!parser) {
      console.error('❌ Parser no encontrado para:', bankId);
      throw new Error(`Parser no encontrado para el banco: ${bankId}`);
    }

    try {
      console.log('🔄 Iniciando parsing con:', parser.bankName);
      const transactions = await parser.parseFile(filePath);
      console.log(`✅ Parsing completado: ${transactions.length} transacciones`);
      
      return {
        success: true,
        bank: parser.bankName,
        bankId: parser.bankName.toLowerCase().replace(/\s+/g, '-'),
        transactions: transactions,
        count: transactions.length
      };
    } catch (error) {
      console.error(`❌ Error parseando archivo con ${parser.bankName}:`, error);
      throw new Error(`Error procesando archivo de ${parser.bankName}: ${error.message}`);
    }
  }
}

module.exports = ParserManager;
