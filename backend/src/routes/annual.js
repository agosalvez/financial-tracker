const express = require('express');
const { getDatabase } = require('../database/database');

const router = express.Router();

router.get('/:year', (req, res) => {
  try {
    const db = getDatabase();
    const year = parseInt(req.params.year);
    const currentYear = new Date().getFullYear();

    // Validar año
    if (isNaN(year) || year < 2020 || year > currentYear) {
      return res.status(400).json({ error: 'Año inválido' });
    }

    // 1. Obtener gastos por categoría
    const gastosPorCategoriaQuery = `
      WITH gastos_${year} AS (
        SELECT 
          t1.categoria,
          ABS(SUM(t1.importe)) as total
        FROM transactions t1
        WHERE strftime('%Y', t1.fecha) = ? AND t1.importe < 0
        GROUP BY t1.categoria
      ),
      gastos_${year-1} AS (
        SELECT 
          t2.categoria,
          ABS(SUM(t2.importe)) as total
        FROM transactions t2
        WHERE strftime('%Y', t2.fecha) = ? AND t2.importe < 0
        GROUP BY t2.categoria
      )
      SELECT 
        g.categoria,
        g.total,
        CASE 
          WHEN ga.total > 0 THEN ((g.total - ga.total) / ga.total) * 100 
          ELSE NULL 
        END as variacion_anual
      FROM gastos_${year} g
      LEFT JOIN gastos_${year-1} ga ON g.categoria = ga.categoria
      ORDER BY g.total DESC
    `;

    const gastosPorCategoria = db.prepare(gastosPorCategoriaQuery)
      .all(year.toString(), (year-1).toString());

    // Calcular porcentajes
    const totalGastos = gastosPorCategoria.reduce((sum, cat) => sum + cat.total, 0);
    gastosPorCategoria.forEach(cat => {
      cat.porcentaje = (cat.total / totalGastos) * 100;
    });

    // 2. Obtener evolución mensual
    const evolucionMensualQuery = `
      WITH meses AS (
        SELECT DISTINCT
          strftime('%Y-%m', fecha) as mes,
          (
            SELECT balance
            FROM transactions t1
            WHERE strftime('%Y-%m', t1.fecha) = strftime('%Y-%m', transactions.fecha)
            AND strftime('%d', t1.fecha) <= '23'
            ORDER BY fecha DESC, id DESC
            LIMIT 1
          ) as saldo,
          SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END) as gastos,
          COUNT(*) as num_transacciones
        FROM transactions
        WHERE strftime('%Y', fecha) = ?
        GROUP BY strftime('%Y-%m', fecha)
      )
      SELECT 
        mes,
        saldo,
        gastos,
        num_transacciones
      FROM meses
      ORDER BY mes ASC
    `;

    const evolucionMensual = db.prepare(evolucionMensualQuery)
      .all(year.toString());

    // Añadir nombres de meses
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                       'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    evolucionMensual.forEach(item => {
      const monthIndex = parseInt(item.mes.split('-')[1]) - 1;
      item.mesNombre = monthNames[monthIndex];
    });

    // 3. Calcular resumen anual
    const resumenQuery = `
      WITH stats_${year} AS (
        SELECT 
          AVG(saldo_diario.balance) as saldo_promedio,
          SUM(CASE WHEN t1.importe < 0 THEN ABS(t1.importe) ELSE 0 END) as gasto_total
        FROM transactions t1
        LEFT JOIN (
          SELECT t2.fecha, SUM(t2.importe) OVER (ORDER BY t2.fecha) as balance
          FROM transactions t2
          WHERE strftime('%Y', t2.fecha) = ?
        ) saldo_diario ON date(t1.fecha) = date(saldo_diario.fecha)
        WHERE strftime('%Y', t1.fecha) = ?
      ),
      stats_${year-1} AS (
        SELECT SUM(CASE WHEN t3.importe < 0 THEN ABS(t3.importe) ELSE 0 END) as gasto_total
        FROM transactions t3
        WHERE strftime('%Y', t3.fecha) = ?
      )
      SELECT 
        s.saldo_promedio,
        s.gasto_total,
        ((s.gasto_total - sa.gasto_total) / NULLIF(sa.gasto_total, 0)) * 100 as variacion_anual
      FROM stats_${year} s
      CROSS JOIN stats_${year-1} sa
    `;

    const resumen = db.prepare(resumenQuery)
      .get(year.toString(), year.toString(), (year-1).toString());

    // Encontrar mes con máximo y mínimo gasto
    let mesMaxGasto = null;
    let mesMinGasto = null;

    if (evolucionMensual && evolucionMensual.length > 0) {
      mesMaxGasto = evolucionMensual.reduce((max, mes) => 
        mes.gastos > max.gastos ? mes : max
      , evolucionMensual[0]);

      mesMinGasto = evolucionMensual.reduce((min, mes) => 
        mes.gastos < min.gastos ? mes : min
      , evolucionMensual[0]);
    }

    // 4. Obtener comparativa con año anterior
    const comparativaQuery = `
      WITH categorias_${year} AS (
        SELECT 
          t1.categoria,
          ABS(SUM(t1.importe)) as total
        FROM transactions t1
        WHERE strftime('%Y', t1.fecha) = ? AND t1.importe < 0
        GROUP BY t1.categoria
      ),
      categorias_${year-1} AS (
        SELECT 
          t2.categoria,
          ABS(SUM(t2.importe)) as total
        FROM transactions t2
        WHERE strftime('%Y', t2.fecha) = ? AND t2.importe < 0
        GROUP BY t2.categoria
      )
      SELECT 
        c.categoria,
        ((c.total - ca.total) / ca.total) * 100 as variacion
      FROM categorias_${year} c
      JOIN categorias_${year-1} ca ON c.categoria = ca.categoria
      ORDER BY ABS(((c.total - ca.total) / ca.total) * 100) DESC
      LIMIT 5
    `;

    const variacionesCategorias = db.prepare(comparativaQuery)
      .all(year.toString(), (year-1).toString());

    // Separar categorías con aumento y reducción
    const categoriasMasAumento = variacionesCategorias
      .filter(cat => cat.variacion > 0)
      .sort((a, b) => b.variacion - a.variacion);

    const categoriasMasReduccion = variacionesCategorias
      .filter(cat => cat.variacion < 0)
      .sort((a, b) => a.variacion - b.variacion);

    res.json({
      gastosPorCategoria,
      evolucionMensual,
      resumen: {
        gastoTotal: resumen.gasto_total,
        saldoPromedio: resumen.saldo_promedio,
        mesMaxGasto: mesMaxGasto ? {
          mes: mesMaxGasto.mesNombre,
          total: mesMaxGasto.gastos
        } : null,
        mesMinGasto: mesMinGasto ? {
          mes: mesMinGasto.mesNombre,
          total: mesMinGasto.gastos
        } : null,
        variacionAnual: resumen.variacion_anual
      },
      comparativa: {
        categoriasMasAumento,
        categoriasMasReduccion
      }
    });

  } catch (error) {
    console.error('Error al obtener datos anuales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
