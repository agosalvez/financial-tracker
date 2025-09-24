export interface Transaction {
  id: number;
  fecha: string;
  hora: string;
  concepto: string;
  importe: number;
  balance: number;
  categoria?: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionFilters {
  fechaDesde?: string;
  fechaHasta?: string;
  concepto?: string;
  categoria?: string;
  importeMin?: number;
  importeMax?: number;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface Category {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  color: string;
  icono?: string;
  created_at?: string;
  total_movimientos: number;
  total_meses: number;
  media_mensual: number;
}

export interface SummaryData {
  totalIngresos: number;
  totalGastos: number;
  balance: number;
  gastosPorCategoria: Array<{
    categoria: string;
    total: number;
    porcentaje: number;
  }>;
  ingresosPorCategoria: Array<{
    categoria: string;
    total: number;
    porcentaje: number;
  }>;
  tendenciaMensual: Array<{
    dia: string;
    balance: number;
  }>;
}
