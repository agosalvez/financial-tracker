// Servicio de categorización usando IA (Anthropic/OpenAI)
const Anthropic = require('@anthropic-ai/sdk');
const { OpenAI } = require('openai');
const { categorizationRules } = require('./categorization');

class AICategorization {
  constructor(provider = 'anthropic', apiKey = null) {
    this.provider = provider;
    this.setupClient(apiKey);
    
    // Preparar el contexto de categorías disponibles
    this.categories = Object.entries(categorizationRules).map(([key, rules]) => ({
      name: rules.categoria,
      subcategories: Object.keys(rules.subcategorias),
      description: `${rules.categoria}: ${rules.keywords.join(', ')}`
    }));
  }

  setupClient(apiKey) {
    if (this.provider === 'anthropic') {
      this.client = new Anthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY
      });
    } else if (this.provider === 'openai') {
      this.client = new OpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY
      });
    }
  }

  async categorizeTransaction(concepto, importe) {
    try {
      // Preparar el prompt con el contexto
      const prompt = this.buildPrompt(concepto, importe);
      
      // Crear una promesa con timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La categorización IA tardó más de 8 segundos')), 8000);
      });

      // Ejecutar la categorización con timeout
      const categorizationPromise = this.provider === 'anthropic' 
        ? this.categorizeWithAnthropic(prompt)
        : this.categorizeWithOpenAI(prompt);

      const result = await Promise.race([categorizationPromise, timeoutPromise]);
      return result;

    } catch (error) {
      console.error('Error en categorización IA:', error.message);
      // En caso de timeout o error, devolver categoría OTROS
      return {
        categoria: 'Otros',
        subcategoria: null,
        confianza: 0.5
      };
    }
  }

  buildPrompt(concepto, importe) {
    return `Por favor, categoriza la siguiente transacción bancaria:

Concepto: "${concepto}"
Importe: ${importe}€

Categorías disponibles:
${this.categories.map(cat => `- ${cat.name} (${cat.subcategories.join(', ')})`).join('\n')}

Responde SOLO con un objeto JSON con este formato exacto:
{
  "categoria": "nombre de la categoría",
  "subcategoria": "nombre de la subcategoría",
  "confianza": 0.95 // número entre 0 y 1
}

Si no estás seguro, usa una confianza menor a 0.7. Si no encuentras una categoría adecuada, usa "Otros" como categoría y null como subcategoría.`;
  }

  async categorizeWithAnthropic(prompt) {
    const response = await this.client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const result = JSON.parse(response.content[0].text);
      return {
        categoria: result.categoria,
        subcategoria: result.subcategoria,
        confianza: result.confianza
      };
    } catch (error) {
      throw new Error('Error parseando respuesta de Anthropic');
    }
  }

  async categorizeWithOpenAI(prompt) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0,
      messages: [
        { role: 'system', content: 'Eres un experto en categorización de transacciones bancarias. Responde SOLO con el JSON solicitado.' },
        { role: 'user', content: prompt }
      ]
    });

    try {
      const result = JSON.parse(response.choices[0].message.content);
      return {
        categoria: result.categoria,
        subcategoria: result.subcategoria,
        confianza: result.confianza
      };
    } catch (error) {
      throw new Error('Error parseando respuesta de OpenAI');
    }
  }
}

module.exports = AICategorization;
