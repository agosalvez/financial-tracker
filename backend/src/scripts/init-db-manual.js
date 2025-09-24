// Script para inicializar la base de datos manualmente
const { initDatabase } = require('../database/database');

async function initializeDatabase() {
  try {
    console.log('🔄 Inicializando base de datos...');
    await initDatabase();
    console.log('✅ Base de datos inicializada correctamente');
    
    // Verificar que las tablas se crearon
    const { getDatabase } = require('../database/database');
    const db = getDatabase();
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📋 Tablas creadas:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Verificar estructura de transactions
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    console.log('\n📊 Estructura de la tabla transactions:');
    tableInfo.forEach(column => {
      console.log(`  - ${column.name} (${column.type})`);
    });
    
    console.log('\n✅ Base de datos lista para usar');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
