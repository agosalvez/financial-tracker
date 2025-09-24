// Script para probar el parser de Eurocaja Rural
const path = require('path');
const EurocajaRuralParser = require('../parsers/parser-eurocajarural');

async function testParser() {
  try {
    const parser = new EurocajaRuralParser();
    const filePath = path.join(__dirname, '../../../frontend/src/app/uploads/download (7).csv');
    
    console.log('🧪 Probando parser de Eurocaja Rural...');
    console.log('📁 Archivo:', filePath);
    
    // Verificar si es un archivo de Eurocaja Rural
    const isBankFile = await parser.isBankFile(filePath);
    console.log('🏦 Es archivo de Eurocaja Rural:', isBankFile);
    
    if (isBankFile) {
      // Parsear el archivo
      const transactions = await parser.parseFile(filePath);
      console.log(`\n📊 Resultado: ${transactions.length} transacciones procesadas`);
      
      if (transactions.length > 0) {
        console.log('\n📋 Primeras 3 transacciones:');
        transactions.slice(0, 3).forEach((tx, index) => {
          console.log(`${index + 1}. ${tx.fecha} - ${tx.concepto} - ${tx.importe}€`);
        });
      }
    } else {
      console.log('❌ El archivo no es de Eurocaja Rural');
    }
    
  } catch (error) {
    console.error('❌ Error probando parser:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testParser();
}

module.exports = testParser;
