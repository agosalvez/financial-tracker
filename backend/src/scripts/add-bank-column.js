// Script para agregar la columna 'banco' a la tabla transactions
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../../data/financial_app.db');

function addBankColumn() {
  try {
    const db = new Database(DB_PATH);
    
    // Verificar si la columna ya existe
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    const hasBankColumn = tableInfo.some(column => column.name === 'banco');
    
    if (hasBankColumn) {
      console.log('✅ La columna "banco" ya existe en la tabla transactions');
      return;
    }
    
    // Agregar la columna banco
    db.exec(`
      ALTER TABLE transactions 
      ADD COLUMN banco TEXT DEFAULT 'Desconocido'
    `);
    
    console.log('✅ Columna "banco" agregada exitosamente a la tabla transactions');
    
    // Actualizar transacciones existentes con banco por defecto
    const updateResult = db.prepare(`
      UPDATE transactions 
      SET banco = 'Desconocido' 
      WHERE banco IS NULL OR banco = ''
    `).run();
    
    console.log(`✅ Actualizadas ${updateResult.changes} transacciones existentes`);
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error agregando columna banco:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addBankColumn();
}

module.exports = addBankColumn;
