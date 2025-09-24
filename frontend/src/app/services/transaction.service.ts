import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Transaction, TransactionFilters, SummaryData, Category } from '../models/transaction.model';
import { AnnualData } from '../models/annual-data.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Obtener conceptos validados
  getValidatedConcepts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/transactions/validated-concepts`);
  }

  // Obtener todas las transacciones con filtros
  getTransactions(filters?: TransactionFilters): Observable<{
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    let params = new HttpParams();
    
    if (filters) {
      // Mapear nombres de campos del frontend a los nombres del backend
      if (filters.fechaDesde) {
        params = params.set('fechaDesde', filters.fechaDesde);
        console.log('Enviando fechaDesde:', filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        params = params.set('fechaHasta', filters.fechaHasta);
        console.log('Enviando fechaHasta:', filters.fechaHasta);
      }
      if (filters.concepto) {
        params = params.set('concepto', filters.concepto);
      }
      if (filters.categoria) {
        params = params.set('categoria', filters.categoria);
      }
      if (filters.importeMin) {
        params = params.set('importeMin', filters.importeMin.toString());
      }
      if (filters.importeMax) {
        params = params.set('importeMax', filters.importeMax.toString());
      }
      if (filters.page) {
        params = params.set('page', filters.page);
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit);
      }
      if (filters.sortBy) {
        params = params.set('sortBy', filters.sortBy);
      }
      if (filters.sortDirection) {
        params = params.set('sortDirection', filters.sortDirection);
      }
    }

    return this.http.get<{
      transactions: Transaction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`${this.apiUrl}/transactions`, { params });
  }

  // Obtener una transacción por ID
  getTransaction(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/transactions/${id}`);
  }

  // Actualizar categoría de una transacción
  updateTransactionCategory(id: number, categoria: string): Observable<{transaction: Transaction, totalUpdated: number}> {
    return this.http.patch<{transaction: Transaction, totalUpdated: number}>(`${this.apiUrl}/transactions/${id}`, {
      categoria
    });
  }

  // Obtener sugerencia de categoría usando IA
  suggestCategory(concepto: string, importe: number): Observable<{
    category_id: number;
    confidence: number;
    keywords: string[];
    explanation: string;
  }> {
    console.log('🤖 Solicitando categorización IA para:', concepto);
    return this.http.post<{
      category_id: number;
      confidence: number;
      keywords: string[];
      explanation: string;
    }>(`${this.apiUrl}/transactions/suggest-category`, {
      concepto,
      importe
    });
  }

  // Obtener bancos soportados
  getSupportedBanks(): Observable<{ banks: any[] }> {
    return this.http.get<{ banks: any[] }>(`${this.apiUrl}/upload/banks`);
  }

  // Subir archivo Excel/CSV
  uploadFile(file: File, bankId?: string): Observable<{ message: string; count: number; bank?: string }> {
    const formData = new FormData();
    formData.append('files', file); // Cambiado a 'files' para coincidir con el backend
    if (bankId) {
      formData.append('bankId', bankId);
    }

    return this.http.post<{ message: string; count: number; bank?: string }>(`${this.apiUrl}/upload`, formData);
  }

  // Subir archivo Excel (método legacy)
  uploadExcel(file: File): Observable<{ message: string; count: number }> {
    return this.uploadFile(file);
  }

  // Obtener datos anuales
  getAnnualData(year: number): Observable<AnnualData> {
    return this.http.get<AnnualData>(`${this.apiUrl}/annual/${year}`);
  }

  // Obtener resumen de datos
  getSummary(filters?: { month?: number; year?: number }): Observable<SummaryData> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.month) {
        params = params.set('month', filters.month.toString());
      }
      if (filters.year) {
        params = params.set('year', filters.year.toString());
      }
    }

    return this.http.get<SummaryData>(`${this.apiUrl}/summary`, { params });
  }

  // Obtener todas las categorías
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  // Crear nueva categoría
  createCategory(category: Omit<Category, 'id' | 'created_at'>): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, category);
  }

  // Actualizar categoría
  updateCategory(id: number, category: Partial<Category>): Observable<Category> {
    return this.http.patch<Category>(`${this.apiUrl}/categories/${id}`, category);
  }

  // Eliminar categoría
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`);
  }
}
