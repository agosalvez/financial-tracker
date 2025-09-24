const { getDatabase, initDatabase } = require('../database/database');

function addCategoryIdColumn() {
  try {
    console.log('🔄 Modificando tabla transactions...');
    const db = getDatabase();

    // Verificar si la columna ya existe
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    const hasCategoryIdColumn = tableInfo.some(column => column.name === 'category_id');

    if (!hasCategoryIdColumn) {
      // Crear nueva columna
      db.exec(`
        BEGIN TRANSACTION;

        -- Añadir columna category_id
        ALTER TABLE transactions ADD COLUMN category_id INTEGER REFERENCES categories(id);

        -- Actualizar índices
        DROP INDEX IF EXISTS idx_transactions_categoria;
        CREATE INDEX idx_transactions_category_id ON transactions(category_id);

        COMMIT;
      `);

      console.log('✅ Columna category_id añadida correctamente');
    } else {
      console.log('ℹ️ La columna category_id ya existe');
    }

  } catch (error) {
    console.error('❌ Error modificando tabla:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase().then(() => {
    addCategoryIdColumn();
  });
}

module.exports = addCategoryIdColumn;
