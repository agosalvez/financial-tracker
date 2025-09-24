const express = require('express');
const OpenAIService = require('../services/openai-service');

const router = express.Router();
const openai = new OpenAIService();

/**
 * @swagger
 * /api/ai/query:
 *   post:
 *     summary: Realiza una consulta a OpenAI
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: El texto de la consulta
 *               options:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                     description: Modelo a usar (default gpt-3.5-turbo)
 *                   temperature:
 *                     type: number
 *                     description: Temperatura (0-2)
 *                   maxTokens:
 *                     type: number
 *                     description: Máximo de tokens en la respuesta
 *                   systemPrompt:
 *                     type: string
 *                     description: Prompt de sistema para dar contexto
 *     responses:
 *       200:
 *         description: Respuesta de OpenAI
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: string
 *                   description: Respuesta del modelo
 */
router.post('/query', async (req, res) => {
  try {
    const { prompt, options } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'El prompt es requerido' });
    }

    const result = await openai.query(prompt, options);
    res.json({ result });

  } catch (error) {
    console.error('Error en consulta AI:', error);
    res.status(500).json({ 
      error: 'Error procesando la consulta',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/ai/classify:
 *   post:
 *     summary: Clasifica un texto en categorías predefinidas
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - categories
 *             properties:
 *               text:
 *                 type: string
 *                 description: Texto a clasificar
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Lista de categorías posibles
 *               options:
 *                 type: object
 *                 properties:
 *                   model:
 *                     type: string
 *                   temperature:
 *                     type: number
 *                   maxTokens:
 *                     type: number
 *     responses:
 *       200:
 *         description: Clasificación del texto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 category:
 *                   type: string
 *                 confidence:
 *                   type: number
 */
router.post('/classify', async (req, res) => {
  try {
    const { text, categories, options } = req.body;

    if (!text || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ 
        error: 'Se requiere texto y un array de categorías' 
      });
    }

    const result = await openai.classify(text, categories, options);
    res.json(result);

  } catch (error) {
    console.error('Error en clasificación AI:', error);
    res.status(500).json({ 
      error: 'Error en la clasificación',
      message: error.message 
    });
  }
});

module.exports = router;
