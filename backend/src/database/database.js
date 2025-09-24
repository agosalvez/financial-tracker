const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      // Crear directorio de base de datos si no existe
      const dbDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Conectar a la base de datos
      const dbPath = path.join(dbDir, 'financial_app.db');
      db = new Database(dbPath);
      
      // Habilitar foreign keys
      db.pragma('foreign_keys = ON');

      // Crear tablas
      createTables();
      
      // Insertar categorías por defecto
      insertDefaultCategories();
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function createTables() {
  // Tabla de categorías
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
      color TEXT NOT NULL DEFAULT '#3b82f6',
      icono TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de transacciones
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
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Verificar y agregar columna banco si no existe (para tablas existentes)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    const hasBankColumn = tableInfo.some(column => column.name === 'banco');
    
    if (!hasBankColumn) {
      console.log('🔧 Agregando columna banco a tabla existente...');
      db.exec(`
        ALTER TABLE transactions 
        ADD COLUMN banco TEXT DEFAULT 'Desconocido'
      `);
      console.log('✅ Columna banco agregada exitosamente');
    }
  } catch (error) {
    console.warn('⚠️ Error verificando columna banco:', error.message);
  }

  // Tabla de categorizaciones aprendidas
  db.exec(`
    CREATE TABLE IF NOT EXISTS concept_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concepto TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      confidence REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Índice para búsqueda rápida de conceptos
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_concept_categories_concepto 
    ON concept_categories(concepto);
  `);

  // Índices para mejorar rendimiento
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_fecha ON transactions(fecha);
    CREATE INDEX IF NOT EXISTS idx_transactions_categoria ON transactions(categoria);
    CREATE INDEX IF NOT EXISTS idx_transactions_importe ON transactions(importe);
    CREATE INDEX IF NOT EXISTS idx_transactions_concepto ON transactions(concepto);
    CREATE INDEX IF NOT EXISTS idx_concept_categories_concepto ON concept_categories(concepto);
  `);
}

function insertDefaultCategories() {
  const defaultCategories = [
    { nombre: 'Alimentación', tipo: 'gasto', color: '#ef4444', icono: '🍕' },
    { nombre: 'Transporte', tipo: 'gasto', color: '#3b82f6', icono: '🚗' },
    { nombre: 'Vivienda', tipo: 'gasto', color: '#10b981', icono: '🏠' },
    { nombre: 'Ocio', tipo: 'gasto', color: '#f59e0b', icono: '🎬' },
    { nombre: 'Salud', tipo: 'gasto', color: '#8b5cf6', icono: '🏥' },
    { nombre: 'Educación', tipo: 'gasto', color: '#06b6d4', icono: '📚' },
    { nombre: 'Ropa', tipo: 'gasto', color: '#ec4899', icono: '👕' },
    { nombre: 'Ahorros', tipo: 'gasto', color: '#84cc16', icono: '💰' },
    { nombre: 'Salario', tipo: 'ingreso', color: '#22c55e', icono: '💼' },
    { nombre: 'Freelance', tipo: 'ingreso', color: '#f97316', icono: '💻' },
    { nombre: 'Inversiones', tipo: 'ingreso', color: '#6366f1', icono: '📈' },
    { nombre: 'Otros', tipo: 'gasto', color: '#64748b', icono: '📦' }
  ];

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (nombre, tipo, color, icono) 
    VALUES (?, ?, ?, ?)
  `);

  defaultCategories.forEach(category => {
    insertCategory.run(category.nombre, category.tipo, category.color, category.icono);
  });
}

function getDatabase() {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  return db;
}

module.exports = {
  initDatabase,
  getDatabase
};
