const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'financial_app.db');
const db = new Database(dbPath);

try {
  // Iniciar transacción
  db.prepare('BEGIN TRANSACTION').run();

  // 1. Crear tabla temporal sin las columnas no deseadas
  db.prepare(`
    CREATE TABLE transactions_temp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      hora TEXT DEFAULT '00:00',
      concepto TEXT NOT NULL,
      importe REAL NOT NULL,
      balance REAL,
      categoria TEXT,
      banco TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 2. Copiar datos a la tabla temporal
  db.prepare(`
    INSERT INTO transactions_temp (
      id, fecha, hora, concepto, importe, balance, categoria, banco, created_at, updated_at
    )
    SELECT 
      id, fecha, hora, concepto, importe, balance, categoria, banco, created_at, updated_at
    FROM transactions
  `).run();

  // 3. Eliminar tabla original
  db.prepare('DROP TABLE transactions').run();

  // 4. Renombrar tabla temporal
  db.prepare('ALTER TABLE transactions_temp RENAME TO transactions').run();

  console.log('✅ Columnas category_id y subcategoria eliminadas correctamente');

  // Confirmar transacción
  db.prepare('COMMIT').run();

} catch (error) {
  console.error('❌ Error:', error);
  db.prepare('ROLLBACK').run();
} finally {
  db.close();
}
