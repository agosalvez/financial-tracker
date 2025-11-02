# Sistema de Parsers de Bancos

Sistema extensible para parsear archivos de extractos bancarios siguiendo principios SOLID.

## 🏗️ Arquitectura

El sistema está diseñado aplicando principios SOLID:

- **Single Responsibility**: Cada parser tiene una única responsabilidad (parsear archivos de un banco específico)
- **Open/Closed**: Abierto para extensión (nuevos parsers), cerrado para modificación
- **Liskov Substitution**: Todos los parsers pueden ser usados de la misma manera
- **Interface Segregation**: Interfaz clara y mínima (BaseParser)
- **Dependency Inversion**: ParserManager depende de abstracciones (BaseParser), no de implementaciones concretas

## 📁 Estructura de Archivos

```
parsers/
├── base-parser.js          # Clase base abstracta que todos los parsers extienden
├── parser-manager.js       # Gestor centralizado de parsers
├── index.js                # Registro centralizado de parsers (aquí se agregan nuevos)
├── parser-eurocajarural.js # Parser para Eurocaja Rural
├── parser-ingdirect.js      # Parser para ING Direct
└── README.md               # Esta documentación
```

## 🚀 Cómo Agregar un Nuevo Parser

### Paso 1: Crear el archivo del parser

Crea un nuevo archivo `parser-[nombrebanco].js` en el directorio `parsers/`.

Ejemplo: `parser-santander.js`

```javascript
const BaseParser = require('./base-parser');
// Otras dependencias necesarias (XLSX, fs, csv, etc.)

class SantanderParser extends BaseParser {
  constructor() {
    // Llama al constructor de BaseParser con:
    // - Nombre del banco
    // - Formatos soportados: ['csv'] o ['csv', 'excel']
    super('Santander', ['csv', 'excel']);
    
    console.log('🏦 Inicializando parser de Santander...');
    // Inicialización adicional si es necesaria
    console.log('✅ Parser de Santander inicializado');
  }

  /**
   * Opcional: Sobrescribe para definir descripción personalizada
   * @returns {string}
   */
  getDefaultDescription() {
    return `Parser para archivos Excel y CSV de ${this.bankName}`;
  }

  /**
   * Implementación obligatoria: Parsea el archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<Array>} - Array de transacciones en formato estándar
   */
  async parseFile(filePath) {
    // Tu lógica de parsing aquí
    // Debe retornar un array de objetos con este formato:
    return [
      {
        fecha: '2024-01-15',      // YYYY-MM-DD
        hora: '10:30',             // HH:MM o '00:00'
        concepto: 'Descripción',   // String limpio
        importe: -50.25,           // Number (negativo para gastos, positivo para ingresos)
        balance: 1000.50,          // Number (opcional)
        banco: this.bankName       // String
      }
    ];
  }

  // Métodos auxiliares privados según necesites
  // parseDate(), parseAmount(), cleanDescription(), etc.
}

module.exports = SantanderParser;
```

### Paso 2: Registrar el parser en el índice

Abre `index.js` y agrega tu parser:

```javascript
const EurocajaRuralParser = require('./parser-eurocajarural');
const INGDirectParser = require('./parser-ingdirect');
const SantanderParser = require('./parser-santander'); // ← Nuevo

const parsers = [
  new EurocajaRuralParser(),
  new INGDirectParser(),
  new SantanderParser() // ← Agregar aquí
];

module.exports = parsers;
```

### Paso 3: ¡Listo!

El parser estará automáticamente disponible en el sistema. No necesitas modificar ningún otro archivo.

## 📋 Formato Estándar de Transacciones

Todos los parsers deben retornar transacciones en este formato:

```javascript
{
  fecha: string,      // Formato: 'YYYY-MM-DD'
  hora: string,        // Formato: 'HH:MM' o '00:00'
  concepto: string,    // Descripción limpia del movimiento
  importe: number,     // Negativo para gastos, positivo para ingresos
  balance: number,      // Saldo después de la transacción (opcional)
  banco: string         // Nombre del banco (usar this.bankName)
}
```

## ✅ Validación Automática

El sistema valida automáticamente que:

- El parser extienda `BaseParser`
- Implemente el método `parseFile()`
- Tenga un `bankName` definido
- No haya parsers duplicados con el mismo ID

Si algo falla, verás un error claro al iniciar el servidor.

## 🔍 Métodos Disponibles de BaseParser

Todos los parsers heredan estos métodos de `BaseParser`:

- `getBankId()`: Retorna el ID normalizado del banco (ej: 'ing-direct')
- `getMetadata()`: Retorna todos los metadatos del parser
- `supportsFileFormat(filePath)`: Valida si un archivo es soportado
- `getNormalizedBankName()`: Retorna el nombre normalizado

## 🧪 Testing

Puedes inyectar parsers personalizados en el ParserManager para testing:

```javascript
const customParser = new TestParser();
const manager = new ParserManager([customParser]);
```

## 📝 Ejemplos de Parsers Existentes

- **EurocajaRuralParser**: Solo CSV, formato específico con encabezados en fila 10
- **INGDirectParser**: CSV y Excel, detección automática de estructura

Revisa estos archivos para ver ejemplos de implementación.

## 🎯 Buenas Prácticas

1. **Limpieza de datos**: Normaliza conceptos (remover números de tarjeta, espacios extra, etc.)
2. **Manejo de errores**: Valida datos antes de procesarlos, retorna `null` para filas inválidas
3. **Logging**: Usa `console.log` para debugging, especialmente al encontrar encabezados
4. **Deduplicación**: El sistema maneja duplicados automáticamente usando Set
5. **Formatos flexibles**: Intenta soportar variaciones en formatos de fecha e importe

## 🐛 Troubleshooting

Si tu parser no aparece en la lista de bancos:

1. Verifica que extendes `BaseParser`
2. Verifica que llamas a `super()` en el constructor
3. Revisa los logs del servidor para errores de validación
4. Asegúrate de haberlo agregado a `index.js`


