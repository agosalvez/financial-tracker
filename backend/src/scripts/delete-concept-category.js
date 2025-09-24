const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'financial_app.db');
const db = new Database(dbPath);

try {
  // Iniciar transacción
  db.prepare('BEGIN TRANSACTION').run();

  // Borrar el registro con ID 54
  const result = db.prepare('DELETE FROM concept_categories WHERE id = ?').run(54);
  
  console.log(`✅ Registro eliminado. Filas afectadas: ${result.changes}`);

  // Confirmar transacción
  db.prepare('COMMIT').run();

} catch (error) {
  console.error('❌ Error:', error);
  db.prepare('ROLLBACK').run();
} finally {
  db.close();
}
