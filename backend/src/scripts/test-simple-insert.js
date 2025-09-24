// Script simple para probar inserción
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../../data/financial_app.db');

function testSimpleInsert() {
  try {
    console.log('🔄 Probando inserción simple...');
    
    const db = new Database(DB_PATH);
    
    // Verificar estado inicial
    const initialCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Transacciones iniciales: ${initialCount.count}`);
    
    // Insertar una transacción simple
    const insert = db.prepare(`
      INSERT INTO transactions (fecha, concepto, importe, balance, categoria, subcategoria, banco)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insert.run(
      '2025-01-31',
      'PRUEBA DE INSERCIÓN',
      100.50,
      1000.00,
      'Prueba',
      'Test',
      'Test Bank'
    );
    
    console.log(`✅ Insertado con ID: ${result.lastInsertRowid}`);
    
    // Verificar estado final
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Transacciones finales: ${finalCount.count}`);
    
    // Mostrar la transacción insertada
    const inserted = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    console.log('📋 Transacción insertada:', inserted);
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testSimpleInsert();
}

module.exports = testSimpleInsert;
