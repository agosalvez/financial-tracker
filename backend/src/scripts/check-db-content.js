// Script para verificar el contenido de la base de datos
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../data/financial_app.db');

function checkDatabase() {
  try {
    console.log('🔍 Verificando base de datos...');
    console.log('📁 Ruta:', DB_PATH);
    
    const db = new Database(DB_PATH);
    
    // Listar todas las tablas
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📋 Tablas encontradas:');
    tables.forEach(table => {
      console.log(`\n🔹 Tabla: ${table.name}`);
      
      // Contar registros en cada tabla
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`  - Registros: ${count.count}`);
      
      // Mostrar estructura de la tabla
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log('  - Columnas:');
      columns.forEach(col => {
        console.log(`    • ${col.name} (${col.type})`);
      });
      
      // Si es la tabla transactions y tiene registros, mostrar algunos ejemplos
      if (table.name === 'transactions' && count.count > 0) {
        const samples = db.prepare('SELECT * FROM transactions LIMIT 3').all();
        console.log('\n  - Ejemplos de registros:');
        samples.forEach((row, i) => {
          console.log(`    ${i + 1}. ${row.fecha} - ${row.concepto} - ${row.importe}€`);
        });
      }
    });
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkDatabase();
}

module.exports = checkDatabase;
