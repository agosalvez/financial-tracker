// Script para verificar la estructura de la base de datos
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../../data/financial_app.db');

function checkDatabaseStructure() {
  try {
    const db = new Database(DB_PATH);
    console.log('🔍 Verificando estructura de la base de datos...');

    // Verificar si la tabla transactions existe
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📋 Tablas en la base de datos:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });

    // Verificar estructura de la tabla transactions
    if (tables.some(t => t.name === 'transactions')) {
      const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
      console.log('\n📊 Estructura de la tabla transactions:');
      tableInfo.forEach(column => {
        console.log(`  - ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'} - ${column.dflt_value ? 'DEFAULT: ' + column.dflt_value : 'NO DEFAULT'}`);
      });

      // Verificar si tiene la columna banco
      const hasBankColumn = tableInfo.some(column => column.name === 'banco');
      console.log(`\n🏦 Columna 'banco' existe: ${hasBankColumn ? '✅ SÍ' : '❌ NO'}`);

      // Contar registros
      const count = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
      console.log(`\n📊 Total de registros: ${count.count}`);
    } else {
      console.log('\n❌ La tabla transactions no existe');
    }

    db.close();
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkDatabaseStructure();
}

module.exports = checkDatabaseStructure;
