const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'financial_app.db');
const db = new Database(dbPath);

try {
  // Iniciar transacción
  db.prepare('BEGIN TRANSACTION').run();

  // Truncar la tabla transactions
  const result = db.prepare('DELETE FROM transactions').run();
  
  // Reiniciar el autoincremento
  db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run('transactions');

  console.log(`✅ Tabla transactions truncada. Filas eliminadas: ${result.changes}`);

  // Confirmar transacción
  db.prepare('COMMIT').run();

} catch (error) {
  console.error('❌ Error:', error);
  db.prepare('ROLLBACK').run();
} finally {
  db.close();
}