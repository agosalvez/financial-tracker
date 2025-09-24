const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'financial_app.db');
const db = new Database(dbPath);

function updatePrestamoCategory() {

  try {
    // Iniciar transacción
    db.prepare('BEGIN TRANSACTION').run();

    // 1. Actualizar la tabla concept_categories
    const updateConceptCategory = db.prepare(`
      INSERT OR REPLACE INTO concept_categories (concepto, category_id, confidence)
      VALUES ('PAGO PRESTAMO', 3, 1.0)
    `);
    updateConceptCategory.run();

    // 2. Actualizar todas las transacciones con concepto PAGO PRESTAMO
    const updateTransactions = db.prepare(`
      UPDATE transactions 
      SET categoria = (SELECT nombre FROM categories WHERE id = 3)
      WHERE concepto LIKE '%PAGO PRESTAMO%'
    `);
    const result = updateTransactions.run();

    // Confirmar transacción
    db.prepare('COMMIT').run();

    console.log(`✅ Actualización completada:`);
    console.log(`- Concepto PAGO PRESTAMO asignado a categoría 3`);
    console.log(`- ${result.changes} transacciones actualizadas`);

  } catch (error) {
    // Revertir cambios en caso de error
    db.prepare('ROLLBACK').run();
    console.error('❌ Error durante la actualización:', error);
    throw error;
  }
}

// Ejecutar la actualización
updatePrestamoCategory();
