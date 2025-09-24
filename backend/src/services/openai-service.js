const { OpenAI } = require('openai');

class OpenAIService {
  constructor(apiKey = null) {
    const finalApiKey = apiKey || process.env.OPENAI_API_KEY;
    
    if (!finalApiKey) {
      throw new Error('OpenAI API Key no proporcionada');
    }

    this.client = new OpenAI({
      apiKey: finalApiKey
    });
  }

  /**
   * Realiza una consulta a OpenAI usando el modelo GPT
   * @param {string} prompt - El texto de la consulta
   * @param {Object} options - Opciones adicionales
   * @param {string} options.model - Modelo a usar (default: 'gpt-3.5-turbo')
   * @param {number} options.temperature - Temperatura (0-2, default: 0.7)
   * @param {number} options.maxTokens - Máximo de tokens en la respuesta (default: 150)
   * @param {string} options.systemPrompt - Prompt de sistema para dar contexto (opcional)
   * @returns {Promise<string>} - La respuesta del modelo
   */
  async query(prompt, options = {}) {
    if (!this.client) {
      throw new Error('Cliente OpenAI no inicializado');
    }

    const {
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      maxTokens = 150,
      systemPrompt = null
    } = options;

    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens
      });

      return response.choices[0].message.content;

    } catch (error) {
      console.error('❌ Error en consulta OpenAI:', error);
      throw new Error(`Error en consulta OpenAI: ${error.message}`);
    }
  }

  /**
   * Realiza una consulta que espera una respuesta en formato JSON
   * @param {string} prompt - El texto de la consulta
   * @param {Object} options - Opciones adicionales (igual que query())
   * @returns {Promise<Object>} - La respuesta parseada como objeto
   */
  async queryJSON(prompt, options = {}) {
    try {
      // Forzar temperatura baja para respuestas más consistentes
      const result = await this.query(prompt, {
        ...options,
        temperature: 0,
        systemPrompt: 'Eres un asistente que SOLO responde en formato JSON válido.'
      });

      return JSON.parse(result);
    } catch (error) {
      console.error('❌ Error parseando respuesta JSON:', error);
      throw new Error('La respuesta no es un JSON válido');
    }
  }

  /**
   * Realiza una consulta que espera una lista de elementos
   * @param {string} prompt - El texto de la consulta
   * @param {Object} options - Opciones adicionales (igual que query())
   * @returns {Promise<string[]>} - Array con los elementos de la lista
   */
  async queryList(prompt, options = {}) {
    try {
      const result = await this.queryJSON(prompt, {
        ...options,
        systemPrompt: 'Eres un asistente que SOLO responde con arrays JSON de strings.'
      });

      if (!Array.isArray(result)) {
        throw new Error('La respuesta no es un array');
      }

      return result;
    } catch (error) {
      console.error('❌ Error obteniendo lista:', error);
      throw new Error('Error procesando la lista de respuestas');
    }
  }

  /**
   * Realiza una consulta de clasificación
   * @param {string} text - El texto a clasificar
   * @param {string[]} categories - Lista de categorías posibles
   * @param {Object} options - Opciones adicionales (igual que query())
   * @returns {Promise<{category: string, confidence: number}>} - Categoría y confianza
   */
  async classify(text, categories, options = {}) {
    const prompt = `
Clasifica el siguiente texto en una de estas categorías: ${categories.join(', ')}

Texto: "${text}"

Responde SOLO con un objeto JSON con este formato:
{
  "category": "nombre de la categoría",
  "confidence": 0.95 // número entre 0 y 1
}`;

    try {
      const result = await this.queryJSON(prompt, {
        ...options,
        temperature: 0
      });

      if (!result.category || typeof result.confidence !== 'number') {
        throw new Error('Respuesta inválida');
      }

      return result;
    } catch (error) {
      console.error('❌ Error en clasificación:', error);
      throw new Error('Error clasificando el texto');
    }
  }
}

module.exports = OpenAIService;
