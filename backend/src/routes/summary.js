const express = require('express');
const { getDatabase } = require('../database/database');

const router = express.Router();

/**
 * @swagger
 * /api/summary:
 *   get:
 *     summary: Obtener resumen financiero
 *     description: Obtiene un resumen completo de las finanzas con estadísticas, categorías y tendencias
 *     tags: [Resumen]
 *     parameters:
 *       - in: query
 *         name: fechaDesde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del resumen (YYYY-MM-DD)
 *       - in: query
 *         name: fechaHasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del resumen (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Resumen financiero obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalIngresos:
 *                   type: number
 *                   description: Total de ingresos
 *                 totalGastos:
 *                   type: number
 *                   description: Total de gastos
 *                 balance:
 *                   type: number
 *                   description: Balance total (ingresos - gastos)
 *                 gastosPorCategoria:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoria:
 *                         type: string
 *                       total:
 *                         type: number
 *                       porcentaje:
 *                         type: number
 *                 ingresosPorCategoria:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoria:
 *                         type: string
 *                       total:
 *                         type: number
 *                       porcentaje:
 *                         type: number
 *                 tendenciaMensual:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       mes:
 *                         type: string
 *                       ingresos:
 *                         type: number
 *                       gastos:
 *                         type: number
 *                       balance:
 *                         type: number
 *                 estadisticas:
 *                   type: object
 *                   properties:
 *                     totalTransacciones:
 *                       type: integer
 *                     importePromedio:
 *                       type: number
 *                     importeMinimo:
 *                       type: number
 *                     importeMaximo:
 *                       type: number
 *                     categoriasUsadas:
 *                       type: integer
 *                 topConceptos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       concepto:
 *                         type: string
 *                       frecuencia:
 *                         type: integer
 *                       totalImporte:
 *                         type: number
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { month, year } = req.query;

    // Construir condiciones de fecha
    let dateCondition = '';
    let params = [];

    if (month && year) {
      // Si se especifica mes y año, filtrar por ese mes específico
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      dateCondition = 'WHERE fecha BETWEEN ? AND ?';
      params = [startDate, endDate];
    } else {
      // Si no se especifica mes, usar fechaDesde y fechaHasta si están presentes
      const { fechaDesde, fechaHasta } = req.query;
      if (fechaDesde && fechaHasta) {
        dateCondition = 'WHERE fecha BETWEEN ? AND ?';
        params = [fechaDesde, fechaHasta];
      } else if (fechaDesde) {
        dateCondition = 'WHERE fecha >= ?';
        params = [fechaDesde];
      } else if (fechaHasta) {
        dateCondition = 'WHERE fecha <= ?';
        params = [fechaHasta];
      }
    }

    // Obtener totales generales
    const totalsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END), 0) as totalIngresos,
        COALESCE(SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END), 0) as totalGastos,
        COALESCE(SUM(importe), 0) as balance
      FROM transactions 
      ${dateCondition}
    `;

    const totals = db.prepare(totalsQuery).get(...params);

    // Obtener gastos por categoría
    const gastosQuery = `
      SELECT 
        COALESCE(categoria, 'Sin categorizar') as categoria,
        SUM(ABS(importe)) as total
      FROM transactions 
      ${dateCondition ? dateCondition + ' AND' : 'WHERE'} importe < 0
      GROUP BY categoria
      ORDER BY total DESC
    `;

    const gastosPorCategoria = db.prepare(gastosQuery).all(...params);

    // Calcular porcentajes para gastos
    const totalGastos = gastosPorCategoria.reduce((sum, item) => sum + item.total, 0);
    gastosPorCategoria.forEach(item => {
      item.porcentaje = totalGastos > 0 ? (item.total / totalGastos) * 100 : 0;
    });

    // Obtener ingresos por categoría
    const ingresosQuery = `
      SELECT 
        COALESCE(categoria, 'Sin categorizar') as categoria,
        SUM(importe) as total
      FROM transactions 
      ${dateCondition ? dateCondition + ' AND' : 'WHERE'} importe > 0
      GROUP BY categoria
      ORDER BY total DESC
    `;

    const ingresosPorCategoria = db.prepare(ingresosQuery).all(...params);

    // Calcular porcentajes para ingresos
    const totalIngresos = ingresosPorCategoria.reduce((sum, item) => sum + item.total, 0);
    ingresosPorCategoria.forEach(item => {
      item.porcentaje = totalIngresos > 0 ? (item.total / totalIngresos) * 100 : 0;
    });

    // Obtener saldo diario acumulado
    const tendenciaQuery = `
      WITH saldos_diarios AS (
        SELECT 
          date(fecha) as dia,
          SUM(importe) OVER (
            ORDER BY date(fecha)
            ROWS UNBOUNDED PRECEDING
          ) as balance
        FROM transactions
        ${dateCondition || ''}
        GROUP BY date(fecha)
      )
      SELECT 
        dia,
        balance
      FROM saldos_diarios
      ORDER BY dia ASC
    `;

    const tendenciaMensual = db.prepare(tendenciaQuery).all(...params);

    // Formatear fechas para mostrar
    tendenciaMensual.forEach(item => {
      const fecha = new Date(item.dia);
      item.dia = fecha.toLocaleDateString('es-ES', { 
        day: '2-digit',
        month: 'short'
      });
    });

    // Obtener estadísticas adicionales
    const statsQuery = `
      SELECT 
        COUNT(*) as totalTransacciones,
        AVG(importe) as importePromedio,
        MIN(importe) as importeMinimo,
        MAX(importe) as importeMaximo,
        COUNT(DISTINCT categoria) as categoriasUsadas
      FROM transactions 
      ${dateCondition}
    `;

    const estadisticas = db.prepare(statsQuery).get(...params);

    // Obtener top 5 conceptos más frecuentes
    const conceptosQuery = `
      SELECT 
        concepto,
        COUNT(*) as frecuencia,
        SUM(ABS(importe)) as totalImporte
      FROM transactions 
      ${dateCondition}
      GROUP BY concepto
      ORDER BY frecuencia DESC, totalImporte DESC
      LIMIT 5
    `;

    const topConceptos = db.prepare(conceptosQuery).all(...params);

    res.json({
      totalIngresos: totals.totalIngresos,
      totalGastos: totals.totalGastos,
      balance: totals.balance,
      gastosPorCategoria,
      ingresosPorCategoria,
      tendenciaMensual, // Ya ordenado por fecha ascendente en la consulta SQL
      estadisticas,
      topConceptos
    });

  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/summary/monthly:
 *   get:
 *     summary: Obtener datos mensuales por año
 *     description: Obtiene el desglose mensual de ingresos, gastos y balance para un año específico
 *     tags: [Resumen]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           default: 2024
 *         description: Año para el cual obtener los datos mensuales
 *     responses:
 *       200:
 *         description: Datos mensuales obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   mes:
 *                     type: string
 *                     description: Nombre del mes
 *                   yearMonth:
 *                     type: string
 *                     description: Año-mes en formato YYYY-MM
 *                   ingresos:
 *                     type: number
 *                   gastos:
 *                     type: number
 *                   balance:
 *                     type: number
 *                   totalTransacciones:
 *                     type: integer
 *       500:
 *         description: Error interno del servidor
 */
router.get('/monthly', (req, res) => {
  try {
    const db = getDatabase();
    const { year = new Date().getFullYear() } = req.query;

    const monthlyQuery = `
      SELECT 
        strftime('%m', fecha) as mes,
        strftime('%Y-%m', fecha) as yearMonth,
        SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) as ingresos,
        SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END) as gastos,
        SUM(importe) as balance,
        COUNT(*) as totalTransacciones
      FROM transactions 
      WHERE strftime('%Y', fecha) = ?
      GROUP BY strftime('%Y-%m', fecha)
      ORDER BY yearMonth
    `;

    const monthlyData = db.prepare(monthlyQuery).all(year);

    // Asegurar que todos los meses del año estén presentes
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const completeMonthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const monthStr = i.toString().padStart(2, '0');
      const yearMonth = `${year}-${monthStr}`;
      
      const existingData = monthlyData.find(item => item.yearMonth === yearMonth);
      
      completeMonthlyData.push({
        mes: monthNames[i - 1],
        yearMonth,
        ingresos: existingData?.ingresos || 0,
        gastos: existingData?.gastos || 0,
        balance: existingData?.balance || 0,
        totalTransacciones: existingData?.totalTransacciones || 0
      });
    }

    res.json(completeMonthlyData);

  } catch (error) {
    console.error('Error al obtener datos mensuales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
