require('dotenv').config({ path: require('path').join(__dirname, '../../env') });
const { categorizeTransaction, initializeAI } = require('../services/categorization');
const { initDatabase } = require('../database/database');

async function testCategorization() {
  try {
    // Inicializar la base de datos
    await initDatabase();

    // Inicializar servicio de IA
    if (process.env.OPENAI_API_KEY) {
      console.log('🤖 Inicializando servicio de IA con OpenAI...');
      initializeAI(process.env.OPENAI_API_KEY);
    } else {
      console.log('⚠️ No se encontró OPENAI_API_KEY, la categorización usará solo reglas');
    }

    const transacciones = [
      {
        concepto: "COMPRA MERCADONA C/MAYOR 23",
        importe: -85.43
      },
      {
        concepto: "NOMINA EMPRESA TECH SL",
        importe: 2450.00
      },
      {
        concepto: "NETFLIX DIGITAL",
        importe: -12.99
      }
    ];

    console.log('🧪 Probando categorización con IA...\n');

    for (const tx of transacciones) {
      await categorizeTransaction(tx.concepto, tx.importe);
    }

    console.log('✅ Pruebas completadas');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

testCategorization();
