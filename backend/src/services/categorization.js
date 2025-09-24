/**
 * Servicio de categorización de transacciones bancarias usando IA
 * 
 * Este servicio utiliza OpenAI para analizar y categorizar transacciones bancarias.
 * La IA recibe el concepto y el importe de la transacción, junto con la lista de
 * categorías disponibles, y devuelve el ID de la categoría más apropiada.
 */

const OpenAIService = require('./openai-service');
const { getDatabase } = require('../database/database');

let aiService = null;

function initializeAI(apiKey = null) {
  try {
    console.log('🤖 Inicializando servicio de IA...');
    aiService = new OpenAIService(apiKey);
    console.log('✅ Servicio de IA inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando servicio de IA:', error);
    aiService = null;
    throw error;
  }
}

async function categorizeTransaction(concepto, importe) {
  if (!concepto) {
    return { category_id: null };
  }

  const db = getDatabase();

  try {
    // Primero buscar en categorizaciones aprendidas
    const savedCategorization = db.prepare(`
      SELECT cc.*, c.nombre as category_name, c.tipo as category_type
      FROM concept_categories cc
      JOIN categories c ON c.id = cc.category_id
      WHERE cc.concepto = ? 
      AND (
        (? > 0 AND c.tipo = 'ingreso') OR 
        (? < 0 AND c.tipo = 'gasto')
      )
      ORDER BY cc.confidence DESC, cc.created_at DESC
      LIMIT 1
    `).get(concepto, importe, importe);

    if (savedCategorization) {
      return {
        category_id: savedCategorization.category_id,
        confidence: savedCategorization.confidence,
        keywords: JSON.parse(savedCategorization.keywords || '[]'),
        explanation: savedCategorization.explanation,
        source: 'database'
      };
    }

    if (!aiService) {
      console.error('❌ Servicio de IA no inicializado');
      throw new Error('Servicio de IA no disponible');
    }

    // Obtener categorías de la base de datos
    const categories = await db.prepare('SELECT id, nombre, tipo FROM categories').all();
    
    const prompt = `Clasifica esta transacción bancaria en una de las siguientes categorías:
${categories.map(cat => `ID ${cat.id}: ${cat.nombre} (${cat.tipo})`).join(', ')}

Transacción: "${concepto}" (${importe}€, ${importe > 0 ? 'INGRESO' : 'GASTO'})

Responde SOLO con un objeto JSON:
{
  "category_id": ID de la categoría,
  "confidence": número entre 0 y 1
}`;

    console.log('🤖 Analizando transacción:', concepto);
    const aiResult = await aiService.queryJSON(prompt, {
      temperature: 0,
      maxTokens: 300
    });
    
    const category = categories.find(c => c.id === aiResult.category_id);
    
    // Validar que la categoría coincide con el tipo (ingreso/gasto)
    const isValidType = category && (
      (importe > 0 && category.tipo === 'ingreso') || 
      (importe < 0 && category.tipo === 'gasto')
    );

    // Si la categoría no coincide con el tipo, usar la categoría "Otros"
    if (!isValidType) {
      console.log('⚠️ Categoría no coincide con tipo (ingreso/gasto), usando categoría Otros');
      const otrosCategory = categories.find(c => c.nombre === 'Otros');
      if (otrosCategory) {
        return {
          category_id: otrosCategory.id,
          confidence: 0.5,
          source: 'fallback'
        };
      }
    }

    // Guardar categorización en la base de datos usando una transacción
    const transaction = db.transaction(() => {
      const insertCategorization = db.prepare(`
        INSERT INTO concept_categories (concepto, category_id, confidence)
        VALUES (?, ?, ?)
      `);

      insertCategorization.run(
        concepto,
        aiResult.category_id,
        aiResult.confidence
      );
    });

    try {
      transaction();
    } catch (error) {
      console.warn('⚠️ Error al guardar:', error.message);
      throw error; // Re-lanzar el error para manejarlo arriba
    }

    return { 
      category_id: aiResult.category_id,
      confidence: aiResult.confidence,
      source: 'ai'
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    // En caso de error, usar la categoría "Otros"
    const db = getDatabase();
    const otrosCategory = await db.prepare('SELECT id FROM categories WHERE nombre = ?').get('Otros');
    return { category_id: otrosCategory?.id || null };
  }
}

module.exports = {
  categorizeTransaction,
  initializeAI
};
