// Script para verificar las transacciones en la base de datos
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../../data/financial_app.db');

function checkTransactions() {
  try {
    const db = new Database(DB_PATH);
    console.log('🔍 Verificando transacciones en la base de datos...');

    // Contar total de transacciones
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Total de transacciones: ${totalCount.count}`);

    // Verificar transacciones por banco
    const byBank = db.prepare('SELECT banco, COUNT(*) as count FROM transactions GROUP BY banco').all();
    console.log('\n🏦 Transacciones por banco:');
    byBank.forEach(row => {
      console.log(`  - ${row.banco}: ${row.count} transacciones`);
    });

    // Verificar transacciones por categoría
    const byCategory = db.prepare('SELECT categoria, COUNT(*) as count FROM transactions GROUP BY categoria').all();
    console.log('\n🏷️ Transacciones por categoría:');
    byCategory.forEach(row => {
      console.log(`  - ${row.categoria}: ${row.count} transacciones`);
    });

    // Mostrar algunas transacciones de ejemplo
    const sample = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5').all();
    console.log('\n📋 Últimas 5 transacciones:');
    sample.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.fecha} - ${tx.concepto} - ${tx.importe}€ - ${tx.categoria}`);
    });

    // Verificar si hay transacciones sin categoría
    const uncategorized = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE categoria IS NULL OR categoria = \'\'').get();
    console.log(`\n❓ Transacciones sin categoría: ${uncategorized.count}`);

    // Verificar si hay transacciones con importe 0
    const zeroAmount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE importe = 0').get();
    console.log(`💰 Transacciones con importe 0: ${zeroAmount.count}`);

    db.close();
  } catch (error) {
    console.error('❌ Error verificando transacciones:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkTransactions();
}

module.exports = checkTransactions;
