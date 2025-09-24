// Script de inicialización de la base de datos
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '../../data/financial_app.db');

function initDatabase() {
  try {
    // Crear directorio de datos si no existe
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Conectar a la base de datos
    const db = new Database(DB_PATH);
    
    console.log('🗄️ Inicializando base de datos...');

    // Crear tabla de transacciones
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        concepto TEXT NOT NULL,
        importe REAL NOT NULL,
        balance REAL NOT NULL,
        categoria TEXT,
        subcategoria TEXT,
        banco TEXT DEFAULT 'Desconocido',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de categorías
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        icono TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar categorías por defecto
    const insertCategory = db.prepare(`
      INSERT OR IGNORE INTO categories (nombre, color, icono) 
      VALUES (?, ?, ?)
    `);

    const defaultCategories = [
      ['Alimentación', '#10B981', 'shopping-cart'],
      ['Transporte', '#3B82F6', 'truck'],
      ['Vivienda', '#8B5CF6', 'home'],
      ['Ocio', '#F59E0B', 'film'],
      ['Salud', '#EF4444', 'heart'],
      ['Educación', '#06B6D4', 'book-open'],
      ['Ropa', '#EC4899', 'shopping-bag'],
      ['Ahorros', '#10B981', 'piggy-bank'],
      ['Otros', '#6B7280', 'dots-horizontal']
    ];

    defaultCategories.forEach(([nombre, color, icono]) => {
      insertCategory.run(nombre, color, icono);
    });

    console.log('✅ Base de datos inicializada correctamente');
    console.log(`📁 Ubicación: ${DB_PATH}`);
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
