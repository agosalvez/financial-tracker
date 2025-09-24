const express = require('express');
const { getDatabase } = require('../database/database');

const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Obtener lista de categorías
 *     description: Obtiene todas las categorías con filtro opcional por tipo
 *     tags: [Categorías]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [ingreso, gasto]
 *         description: Filtrar por tipo de categoría
 *     responses:
 *       200:
 *         description: Lista de categorías obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { tipo } = req.query;

    let query = `
      WITH stats AS (
        SELECT 
          categoria,
          COUNT(*) as total_movimientos,
          COUNT(DISTINCT strftime('%Y-%m', fecha)) as total_meses,
          ROUND(CAST(COUNT(*) AS FLOAT) / COUNT(DISTINCT strftime('%Y-%m', fecha)), 1) as media_mensual
        FROM transactions
        GROUP BY categoria
      )
      SELECT 
        c.*,
        COALESCE(s.total_movimientos, 0) as total_movimientos,
        COALESCE(s.total_meses, 0) as total_meses,
        COALESCE(s.media_mensual, 0) as media_mensual
      FROM categories c
      LEFT JOIN stats s ON c.nombre = s.categoria
    `;

    let params = [];
    if (tipo) {
      query += ' WHERE c.tipo = ?';
      params.push(tipo);
    }

    query += ' ORDER BY c.tipo, c.nombre';

    const categories = db.prepare(query).all(...params);
    res.json(categories);

  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Obtener una categoría por ID
 *     description: Obtiene los detalles de una categoría específica
 *     tags: [Categorías]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Categoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(category);

  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Crear una nueva categoría
 *     description: Crea una nueva categoría en el sistema
 *     tags: [Categorías]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - tipo
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre de la categoría
 *               tipo:
 *                 type: string
 *                 enum: [ingreso, gasto]
 *                 description: Tipo de categoría
 *               color:
 *                 type: string
 *                 description: Color hexadecimal de la categoría
 *                 default: '#3b82f6'
 *               icono:
 *                 type: string
 *                 description: Icono de la categoría
 *     responses:
 *       201:
 *         description: Categoría creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Datos inválidos o categoría ya existe
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { nombre, tipo, color, icono } = req.body;

    // Validaciones
    if (!nombre || !tipo) {
      return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    }

    if (!['ingreso', 'gasto'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser "ingreso" o "gasto"' });
    }

    // Verificar que no existe una categoría con el mismo nombre
    const existingCategory = db.prepare('SELECT id FROM categories WHERE nombre = ?').get(nombre);
    if (existingCategory) {
      return res.status(400).json({ error: 'Ya existe una categoría con este nombre' });
    }

    // Insertar nueva categoría
    const insertQuery = `
      INSERT INTO categories (nombre, tipo, color, icono)
      VALUES (?, ?, ?, ?)
    `;

    const result = db.prepare(insertQuery).run(
      nombre,
      tipo,
      color || '#3b82f6',
      icono || null
    );

    // Obtener categoría creada
    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newCategory);

  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Actualizar una categoría
 *     description: Actualiza los datos de una categoría existente
 *     tags: [Categorías]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 description: Nombre de la categoría
 *               tipo:
 *                 type: string
 *                 enum: [ingreso, gasto]
 *                 description: Tipo de categoría
 *               color:
 *                 type: string
 *                 description: Color hexadecimal de la categoría
 *               icono:
 *                 type: string
 *                 description: Icono de la categoría
 *     responses:
 *       200:
 *         description: Categoría actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Datos inválidos o nombre duplicado
 *       404:
 *         description: Categoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { nombre, tipo, color, icono } = req.body;

    // Verificar que la categoría existe
    const existingCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Validaciones
    if (tipo && !['ingreso', 'gasto'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser "ingreso" o "gasto"' });
    }

    // Si se está cambiando el nombre, verificar que no existe otra categoría con ese nombre
    if (nombre && nombre !== existingCategory.nombre) {
      const duplicateCategory = db.prepare('SELECT id FROM categories WHERE nombre = ? AND id != ?').get(nombre, id);
      if (duplicateCategory) {
        return res.status(400).json({ error: 'Ya existe una categoría con este nombre' });
      }
    }

    // Construir query de actualización dinámicamente
    const updates = [];
    const params = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(nombre);
    }

    if (tipo !== undefined) {
      updates.push('tipo = ?');
      params.push(tipo);
    }

    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }

    if (icono !== undefined) {
      updates.push('icono = ?');
      params.push(icono);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    params.push(id);

    const updateQuery = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(updateQuery).run(...params);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'No se pudo actualizar la categoría' });
    }

    // Obtener categoría actualizada
    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

    res.json(updatedCategory);

  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Eliminar una categoría
 *     description: Elimina una categoría del sistema (solo si no tiene transacciones asociadas)
 *     tags: [Categorías]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la categoría
 *     responses:
 *       200:
 *         description: Categoría eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Categoría eliminada correctamente'
 *       400:
 *         description: No se puede eliminar porque tiene transacciones asociadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 count:
 *                   type: integer
 *       404:
 *         description: Categoría no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Verificar que la categoría existe
    const existingCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existingCategory) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Verificar si hay transacciones usando esta categoría
    const transactionsUsingCategory = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE categoria = ?').get(existingCategory.nombre);
    
    if (transactionsUsingCategory.count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque tiene transacciones asociadas',
        count: transactionsUsingCategory.count
      });
    }

    // Eliminar categoría
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(400).json({ error: 'No se pudo eliminar la categoría' });
    }

    res.json({ message: 'Categoría eliminada correctamente' });

  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
