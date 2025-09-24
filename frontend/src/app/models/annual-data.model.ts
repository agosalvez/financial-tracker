export interface AnnualData {
  // Datos por categoría
  gastosPorCategoria: Array<{
    categoria: string;
    total: number;
    porcentaje: number;
    variacionAnual?: number; // % de variación respecto al año anterior
  }>;

  // Evolución mensual
  evolucionMensual: Array<{
    mes: string;        // Formato: "YYYY-MM"
    mesNombre: string;  // Formato: "Ene", "Feb", etc.
    saldo: number;
    gastos: number;
    numTransacciones: number;
  }>;

  // Resumen anual
  resumen: {
    gastoTotal: number;
    saldoPromedio: number;
    mesMaxGasto: {
      mes: string;
      total: number;
    };
    mesMinGasto: {
      mes: string;
      total: number;
    };
    variacionAnual: number;  // % de variación respecto al año anterior
  };

  // Comparativa con año anterior
  comparativa?: {
    gastoTotalAnterior: number;
    saldoPromedioAnterior: number;
    categoriasMasAumento: Array<{
      categoria: string;
      variacion: number;
    }>;
    categoriasMasReduccion: Array<{
      categoria: string;
      variacion: number;
    }>;
  };
}
