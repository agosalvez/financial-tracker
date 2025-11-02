/**
 * Índice centralizado de parsers
 * Este archivo facilita la adición de nuevos parsers
 * Solo necesitas importar el parser y agregarlo al array
 * 
 * Para agregar un nuevo parser:
 * 1. Crea el archivo parser-[nombrebanco].js
 * 2. Importa el parser aquí
 * 3. Agrega una nueva instancia al array parsers
 */

const EurocajaRuralParser = require('./parser-eurocajarural');
const INGDirectParser = require('./parser-ingdirect');

/**
 * Array con todos los parsers disponibles
 * Agrega aquí cualquier nuevo parser que crees
 * @type {Array<BaseParser>}
 */
const parsers = [
  new EurocajaRuralParser(),
  new INGDirectParser()
  // Agrega aquí nuevos parsers:
  // new NuevoBancoParser(),
];

module.exports = parsers;


