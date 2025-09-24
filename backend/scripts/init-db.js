const { initDatabase } = require('../src/database/database');

async function main() {
  try {
    console.log('🔄 Inicializando base de datos...');
    await initDatabase();
    console.log('✅ Base de datos inicializada correctamente');
    console.log('📊 Categorías por defecto creadas');
    console.log('🚀 Base de datos lista para usar');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

main();
