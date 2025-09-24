// Cargar variables de entorno antes que nada
require('dotenv').config({ path: 'env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Importar rutas
const uploadRoutes = require('./routes/upload');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const summaryRoutes = require('./routes/summary');
const aiRoutes = require('./routes/ai');
const annualRoutes = require('./routes/annual');

// Importar base de datos
const { initDatabase } = require('./database/database');
const { initializeAI } = require('./services/categorization');

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Financial App API',
      version: '1.0.0',
      description: 'API para gestión de finanzas personales con importación de archivos Excel',
      contact: {
        name: 'Financial App',
        email: 'support@financialapp.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      schemas: {
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            fecha: { type: 'string', format: 'date' },
            concepto: { type: 'string' },
            importe: { type: 'number' },
            categoria: { type: 'string' },
            tipo: { type: 'string', enum: ['ingreso', 'gasto'] }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nombre: { type: 'string' },
            color: { type: 'string' },
            icono: { type: 'string' }
          }
        },
        SummaryData: {
          type: 'object',
          properties: {
            totalIngresos: { type: 'number' },
            totalGastos: { type: 'number' },
            balance: { type: 'number' },
            gastosPorCategoria: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  categoria: { type: 'string' },
                  total: { type: 'number' },
                  porcentaje: { type: 'number' }
                }
              }
            },
            tendenciaMensual: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  mes: { type: 'string' },
                  ingresos: { type: 'number' },
                  gastos: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'] // Ruta a los archivos de rutas
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP cada 15 minutos
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Rutas de la API
app.use('/api/upload', uploadRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/annual', annualRoutes);

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Financial App API Documentation'
}));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check del servidor
 *     description: Verifica el estado del servidor y la API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'OK'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Fecha y hora actual del servidor
 *                 version:
 *                   type: string
 *                   example: '1.0.0'
 *                   description: Versión de la API
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializar base de datos y servidor
async function startServer() {
  try {
    // Verificar que tenemos las variables de entorno necesarias
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ No se encontró OPENAI_API_KEY en el archivo .env');
      process.exit(1);
    } else {
      console.log('✅ API Key de OpenAI cargada correctamente');
    }

    await initDatabase();
    console.log('✅ Base de datos inicializada correctamente');

    // Inicializar servicio de IA
    initializeAI(process.env.OPENAI_API_KEY);
    console.log('✅ Servicio de IA inicializado correctamente');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api`);
      console.log(`📚 Documentación Swagger en http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health check en http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error al inicializar el servidor:', error);
    process.exit(1);
  }
}

startServer();
