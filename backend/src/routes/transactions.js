const express = require('express');
const { getDatabase } = require('../database/database');
const { categorizeTransaction } = require('../services/categorization');

const router = express.Router();

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Obtener lista de transacciones
 *     description: Obtiene una lista paginada de transacciones con filtros opcionales
 *     tags: [Transacciones]
 *     parameters:
 *       - in: query
 *         name: fechaDesde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del filtro (YYYY-MM-DD)
 *       - in: query
 *         name: fechaHasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del filtro (YYYY-MM-DD)
 *       - in: query
 *         name: concepto
 *         schema:
 *           type: string
 *         description: Filtrar por concepto (búsqueda parcial)
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: importeMin
 *         schema:
 *           type: number
 *         description: Importe mínimo
 *       - in: query
 *         name: importeMax
 *         schema:
 *           type: number
 *         description: Importe máximo
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Número de elementos por página
 *     responses:
 *       200:
 *         description: Lista de transacciones obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Error interno del servidor
 */
// Obtener conceptos validados
router.get('/validated-concepts', (req, res) => {
  try {
    const db = getDatabase();
    const validatedConcepts = db.prepare(`
      SELECT DISTINCT concepto 
      FROM concept_categories
      WHERE confidence >= 0.8
    `).all();

    console.log('Conceptos validados encontrados:', validatedConcepts);
    res.json(validatedConcepts.map(vc => vc.concepto));
  } catch (error) {
    console.error('Error al obtener conceptos validados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { 
      fechaDesde, 
      fechaHasta, 
      concepto, 
      categoria, 
      importeMin, 
      importeMax,
      page = 1,
      limit = 50,
      sortBy = 'fecha',
      sortDirection = 'desc'
    } = req.query;

    console.log('Filtros recibidos:', {
      fechaDesde,
      fechaHasta,
      concepto,
      categoria,
      importeMin,
      importeMax,
      page,
      limit
    });

    let whereConditions = [];
    let params = [];

    // Construir condiciones WHERE dinámicamente
    if (fechaDesde) {
      whereConditions.push('date(fecha) >= date(?)');
      params.push(fechaDesde);
      console.log('Añadiendo filtro fechaDesde:', fechaDesde);
    }

    if (fechaHasta) {
      whereConditions.push('date(fecha) <= date(?)');
      params.push(fechaHasta);
      console.log('Añadiendo filtro fechaHasta:', fechaHasta);
    }

    if (concepto) {
      whereConditions.push('concepto LIKE ?');
      params.push(`%${concepto}%`);
    }

    if (categoria) {
      whereConditions.push('LOWER(categoria) = LOWER(?)');
      params.push(categoria);
    }

    if (importeMin !== undefined) {
      whereConditions.push('importe >= ?');
      params.push(parseFloat(importeMin));
    }

    if (importeMax !== undefined) {
      whereConditions.push('importe <= ?');
      params.push(parseFloat(importeMax));
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Contar total de registros
    console.log('Query conditions:', whereConditions);
    console.log('Query params:', params);
    
    const countQuery = `SELECT COUNT(*) as total FROM transactions ${whereClause}`;
    console.log('Count query:', countQuery);
    const countResult = db.prepare(countQuery).get(...params);
    const total = countResult.total;

    // Calcular paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Validar columna de ordenación
    const validColumns = ['fecha', 'concepto', 'importe', 'balance', 'categoria'];
    const orderBy = validColumns.includes(sortBy) ? sortBy : 'fecha';
    const orderDirection = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Obtener transacciones con paginación y ordenación
    const query = `
      SELECT * FROM transactions 
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}, hora ${orderDirection}, id DESC
      LIMIT ? OFFSET ?
    `;
    
    console.log('Final query:', query);
    console.log('Final params:', [...params, parseInt(limit), offset]);
    
    const transactions = db.prepare(query).all(...params, parseInt(limit), offset);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Obtener una transacción por ID
 *     description: Obtiene los detalles de una transacción específica
 *     tags: [Transacciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la transacción
 *     responses:
 *       200:
 *         description: Transacción encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transacción no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    res.json(transaction);

  } catch (error) {
    console.error('Error al obtener transacción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   patch:
 *     summary: Actualizar una transacción
 *     description: Actualiza los datos de una transacción existente
 *     tags: [Transacciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la transacción
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoria:
 *                 type: string
 *                 description: Nueva categoría de la transacción
 *               notas:
 *                 type: string
 *                 description: Notas adicionales
 *     responses:
 *       200:
 *         description: Transacción actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: No se pudo actualizar la transacción
 *       404:
 *         description: Transacción no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { categoria, notas } = req.body;

    // Verificar que la transacción existe
    const existingTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    // Iniciar transacción
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // 1. Obtener el concepto de la transacción
      const transaction = db.prepare('SELECT concepto FROM transactions WHERE id = ?').get(id);
      if (!transaction) {
        throw new Error('Transacción no encontrada');
      }

      // 2. Actualizar todas las transacciones con el mismo concepto
      const updateTransactionsQuery = `
        UPDATE transactions 
        SET categoria = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE concepto = ?
      `;

      const transactionsResult = db.prepare(updateTransactionsQuery).run(
        categoria || null,
        transaction.concepto
      );

      // 3. Actualizar o insertar en concept_categories
      const categoryId = db.prepare('SELECT id FROM categories WHERE nombre = ?').get(categoria)?.id;
      
      if (categoryId) {
        // Primero intentamos actualizar el registro existente
        const updateConceptQuery = `
          UPDATE concept_categories 
          SET category_id = ?, confidence = 1.0
          WHERE concepto = ?
        `;

        const updateResult = db.prepare(updateConceptQuery).run(categoryId, transaction.concepto);

        // Si no existe un registro para actualizar, entonces lo insertamos
        if (updateResult.changes === 0) {
          const insertConceptQuery = `
            INSERT INTO concept_categories (concepto, category_id, confidence)
            VALUES (?, ?, 1.0)
          `;
          db.prepare(insertConceptQuery).run(transaction.concepto, categoryId);
        }
      }

      // Confirmar transacción
      db.prepare('COMMIT').run();

      // Obtener transacción actualizada
      const updatedTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);

      res.json({
        transaction: updatedTransaction,
        totalUpdated: transactionsResult.changes
      });

    } catch (error) {
      // Revertir cambios en caso de error
      db.prepare('ROLLBACK').run();
      throw error;
    }

  } catch (error) {
    console.error('Error al actualizar transacción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Eliminar una transacción
 *     description: Elimina una transacción del sistema
 *     tags: [Transacciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la transacción
 *     responses:
 *       200:
 *         description: Transacción eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Transacción eliminada correctamente'
 *       400:
 *         description: No se pudo eliminar la transacción
 *       404:
 *         description: Transacción no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Verificar que la transacción existe
    const existingTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!existingTransaction) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    // Eliminar transacción
    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'No se pudo eliminar la transacción' });
    }

    res.json({ message: 'Transacción eliminada correctamente' });

  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/transactions/suggest-category:
 *   post:
 *     summary: Sugerir categoría usando IA
 *     description: Analiza una transacción y sugiere una categoría usando IA
 *     tags: [Transacciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               concepto:
 *                 type: string
 *                 description: Concepto/descripción de la transacción
 *               importe:
 *                 type: number
 *                 description: Importe de la transacción
 *     responses:
 *       200:
 *         description: Categoría sugerida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 category_id:
 *                   type: number
 *                 confidence:
 *                   type: number
 *                 keywords:
 *                   type: array
 *                   items:
 *                     type: string
 *                 explanation:
 *                   type: string
 *       500:
 *         description: Error interno del servidor
 */
router.post('/suggest-category', async (req, res) => {
  try {
    const { concepto, importe } = req.body;

    if (!concepto) {
      return res.status(400).json({ error: 'El concepto es requerido' });
    }

    if (typeof importe !== 'number') {
      return res.status(400).json({ error: 'El importe debe ser un número' });
    }

    console.log('🤖 Solicitando categorización para:', {
      concepto,
      importe: importe.toFixed(2) + '€'
    });

    const result = await categorizeTransaction(concepto, importe);
    
    console.log('✅ Categorización completada:', result);

    res.json(result);

  } catch (error) {
    console.error('❌ Error al sugerir categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
