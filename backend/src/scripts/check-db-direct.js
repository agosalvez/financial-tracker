// Script para verificar la base de datos directamente
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../../data/financial_app.db');

function checkDatabaseDirect() {
  try {
    console.log('🔍 Verificando base de datos directamente...');
    console.log(`📁 Ruta: ${DB_PATH}`);
    
    const db = new Database(DB_PATH);
    
    // Contar total de transacciones
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Total de transacciones: ${totalCount.count}`);
    
    if (totalCount.count > 0) {
      // Mostrar algunas transacciones
      const sample = db.prepare('SELECT * FROM transactions ORDER BY id DESC LIMIT 5').all();
      console.log('\n📋 Últimas 5 transacciones:');
      sample.forEach((tx, index) => {
        console.log(`${index + 1}. ID:${tx.id} - ${tx.fecha} - ${tx.concepto} - ${tx.importe}€ - ${tx.categoria} - ${tx.banco}`);
      });
      
      // Verificar por banco
      const byBank = db.prepare('SELECT banco, COUNT(*) as count FROM transactions GROUP BY banco').all();
      console.log('\n🏦 Transacciones por banco:');
      byBank.forEach(row => {
        console.log(`  - ${row.banco}: ${row.count} transacciones`);
      });
    }
    
    db.close();
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkDatabaseDirect();
}

module.exports = checkDatabaseDirect;
