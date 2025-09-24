// Script para verificar la estructura de la tabla transactions
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../../data/financial_app.db');

function checkTableStructure() {
  try {
    const db = new Database(DB_PATH);
    
    console.log('🔍 Verificando estructura de la tabla transactions...');
    
    // Obtener información de la tabla
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    
    console.log('\n📋 Columnas de la tabla transactions:');
    tableInfo.forEach(column => {
      console.log(`  - ${column.name} (${column.type}) - ${column.notnull ? 'NOT NULL' : 'NULL'} - ${column.dflt_value ? `DEFAULT: ${column.dflt_value}` : 'NO DEFAULT'}`);
    });
    
    // Verificar si existe la columna banco
    const hasBankColumn = tableInfo.some(column => column.name === 'banco');
    console.log(`\n🏦 Columna 'banco' existe: ${hasBankColumn ? '✅ SÍ' : '❌ NO'}`);
    
    if (!hasBankColumn) {
      console.log('\n🔧 Agregando columna banco...');
      db.exec(`
        ALTER TABLE transactions 
        ADD COLUMN banco TEXT DEFAULT 'Desconocido'
      `);
      console.log('✅ Columna banco agregada exitosamente');
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error verificando estructura de tabla:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkTableStructure();
}

module.exports = checkTableStructure;
