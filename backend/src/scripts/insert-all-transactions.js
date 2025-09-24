// Script para insertar todas las transacciones del CSV
const path = require('path');
const Database = require('better-sqlite3');
const EurocajaRuralParser = require('../parsers/parser-eurocajarural');
const { categorizeTransaction } = require('../services/categorization');

async function insertAllTransactions() {
  try {
    console.log('🔄 Insertando todas las transacciones del CSV...');
    
    const db = new Database(path.join(__dirname, '../../data/financial_app.db'));
    
    // Verificar estado inicial
    const initialCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Transacciones iniciales: ${initialCount.count}`);
    
    // Parsear archivo CSV
    const parser = new EurocajaRuralParser();
    const filePath = path.join(__dirname, '../../../frontend/src/app/uploads/download(7).csv');
    const transactions = await parser.parseFile(filePath);
    console.log(`📊 Transacciones parseadas: ${transactions.length}`);
    
    if (transactions.length === 0) {
      console.log('❌ No se parsearon transacciones');
      return;
    }
    
    // Usar transacción para insertar todas
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
        
        insertedCount++;
        
        if (insertedCount % 10 === 0) {
          console.log(`📝 Insertadas ${insertedCount}/${transactions.length} transacciones...`);
        }
      }
      
      return insertedCount;
    });
    
    console.log('🔄 Insertando todas las transacciones...');
    const insertedCount = insertMany(transactions);
    
    // Verificar estado final
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Transacciones finales: ${finalCount.count}`);
    console.log(`✅ Insertadas: ${insertedCount}`);
    
    // Mostrar resumen por banco
    const byBank = db.prepare('SELECT banco, COUNT(*) as count FROM transactions GROUP BY banco').all();
    console.log('\n🏦 Transacciones por banco:');
    byBank.forEach(row => {
      console.log(`  - ${row.banco}: ${row.count} transacciones`);
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  insertAllTransactions();
}

module.exports = insertAllTransactions;
