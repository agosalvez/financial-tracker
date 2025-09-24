// Script para probar el proceso completo de subida y listado
const path = require('path');
const Database = require('better-sqlite3');
const EurocajaRuralParser = require('../parsers/parser-eurocajarural');
const { categorizeTransaction } = require('../services/categorization');

async function testFullProcess() {
  try {
    console.log('🔄 Iniciando prueba completa...');
    
    // 1. Conectar a la base de datos
    const dbPath = path.join(__dirname, '../data/financial_app.db');
    console.log('📁 Base de datos:', dbPath);
    const db = new Database(dbPath);
    
    // 2. Verificar estado inicial
    const initialCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`📊 Transacciones iniciales: ${initialCount.count}`);
    
    // 3. Truncar la tabla si tiene datos
    if (initialCount.count > 0) {
      console.log('🗑️ Truncando tabla...');
      db.prepare('DELETE FROM transactions').run();
      db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run('transactions');
      console.log('✅ Tabla truncada');
    }
    
    // 4. Parsear archivo CSV
    const parser = new EurocajaRuralParser();
    const filePath = path.join(__dirname, '../../../frontend/src/app/uploads/download(7).csv');
    console.log('📄 Procesando archivo:', filePath);
    
    const parseResult = await parser.parseFile(filePath);
    console.log(`📊 Transacciones parseadas: ${parseResult.length}`);
    
    // 5. Insertar transacciones
    const insertTransaction = db.prepare(`
      INSERT INTO transactions (fecha, concepto, importe, balance, categoria, subcategoria, banco)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Usar transacción para insertar todo
    const insertMany = db.transaction((transactions) => {
      let count = 0;
      for (const tx of transactions) {
        const categorization = categorizeTransaction(tx.concepto, tx.importe);
        
        insertTransaction.run(
          tx.fecha,
          tx.concepto,
          tx.importe,
          tx.balance,
          categorization.categoria,
          categorization.subcategoria,
          'Eurocaja Rural'
        );
        
        count++;
        if (count % 10 === 0) {
          console.log(`✅ Insertadas ${count}/${transactions.length} transacciones`);
        }
      }
      return count;
    });
    
    const insertedCount = insertMany(parseResult);
    console.log(`✅ Total insertadas: ${insertedCount}`);
    
    // 6. Verificar resultados
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`\n📊 Verificación final:`);
    console.log(`- Total transacciones: ${finalCount.count}`);
    
    // Mostrar algunas transacciones de ejemplo
    const samples = db.prepare('SELECT * FROM transactions ORDER BY fecha DESC LIMIT 5').all();
    console.log('\n📋 Últimas 5 transacciones:');
    samples.forEach((tx, i) => {
      console.log(`${i + 1}. ${tx.fecha} - ${tx.concepto} - ${tx.importe}€ - ${tx.categoria}`);
    });
    
    // Mostrar resumen por categoría
    const byCategory = db.prepare('SELECT categoria, COUNT(*) as count, SUM(importe) as total FROM transactions GROUP BY categoria').all();
    console.log('\n📊 Resumen por categoría:');
    byCategory.forEach(cat => {
      console.log(`- ${cat.categoria}: ${cat.count} transacciones, ${cat.total}€`);
    });
    
    db.close();
    console.log('\n✅ Proceso completo finalizado');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testFullProcess();
}

module.exports = testFullProcess;
