// Script para probar la inserción directa de transacciones
const path = require('path');
const EurocajaRuralParser = require('../parsers/parser-eurocajarural');
const { getDatabase } = require('../database/database');
const { categorizeTransaction } = require('../services/categorization');

async function testDirectInsert() {
  try {
    console.log('🔄 Iniciando prueba de inserción directa...');
    
    // Inicializar base de datos
    const { initDatabase } = require('../database/database');
    await initDatabase();
    console.log('✅ Base de datos inicializada');
    
    // Obtener conexión a la base de datos
    const db = getDatabase();
    console.log('✅ Conexión a base de datos establecida');
    
    // Verificar estado inicial
    const initialCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Transacciones iniciales: ${initialCount.count}`);
    
    // Parsear archivo CSV
    const parser = new EurocajaRuralParser();
    const filePath = path.join(__dirname, '../../../frontend/src/app/uploads/download(7).csv');
    console.log(`📁 Archivo: ${filePath}`);
    
    const transactions = await parser.parseFile(filePath);
    console.log(`📊 Transacciones parseadas: ${transactions.length}`);
    
    if (transactions.length === 0) {
      console.log('❌ No se parsearon transacciones');
      return;
    }
    
    // Usar transacción para asegurar que se guarden los datos
    const insertMany = db.transaction((transactions) => {
      const insertTransaction = db.prepare(`
        INSERT INTO transactions (fecha, concepto, importe, balance, categoria, subcategoria, banco)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      let insertedCount = 0;
      
      for (const transaction of transactions) {
        // Categorizar
        const categorization = categorizeTransaction(transaction.concepto, transaction.importe);
        
        // Insertar
        const result = insertTransaction.run(
          transaction.fecha,
          transaction.concepto,
          transaction.importe,
          transaction.balance,
          categorization.categoria,
          categorization.subcategoria,
          transaction.banco || 'Eurocaja Rural'
        );
        
        console.log(`✅ Insertado con ID: ${result.lastInsertRowid}`);
        insertedCount++;
      }
      
      return insertedCount;
    });
    
    console.log('🔄 Insertando transacciones en transacción...');
    
    const transactionsToInsert = transactions.slice(0, 5);
    const insertedCount = insertMany(transactionsToInsert);
    
    // Verificar estado final
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Transacciones finales: ${finalCount.count}`);
    console.log(`✅ Insertadas: ${insertedCount}`);
    console.log(`❌ Errores: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('Errores:', errors);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testDirectInsert();
}

module.exports = testDirectInsert;
