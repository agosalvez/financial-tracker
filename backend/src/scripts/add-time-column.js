const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'financial_app.db');
const db = new Database(dbPath);

try {
  // Iniciar transacción
  db.prepare('BEGIN TRANSACTION').run();

  // 1. Añadir columna hora
  db.prepare(`
    ALTER TABLE transactions 
    ADD COLUMN hora TEXT DEFAULT '00:00'
  `).run();

  // 2. Actualizar la columna hora para las transacciones existentes
  // Por defecto se quedarán con '00:00' ya que no tenemos la hora real

  console.log('✅ Columna hora añadida correctamente');
  
  // Confirmar transacción
  db.prepare('COMMIT').run();

} catch (error) {
  console.error('❌ Error:', error);
  db.prepare('ROLLBACK').run();
} finally {
  db.close();
}
