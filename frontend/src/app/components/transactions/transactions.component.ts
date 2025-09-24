import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';
import { Transaction, TransactionFilters } from '../../models/transaction.model';
import { MonthSelectorComponent } from '../shared/month-selector.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, MonthSelectorComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-6">
          <h1 class="text-3xl font-bold text-gray-900">Movimientos</h1>
          <app-month-selector 
            [currentDate]="selectedMonth"
            (monthChange)="onMonthChange($event)">
          </app-month-selector>
        </div>
        <div class="text-sm text-gray-500">
          {{ transactions.length }} movimientos encontrados
        </div>
      </div>

      <!-- Filtros -->
      <div class="card">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
            <input type="date" 
                   [(ngModel)]="filters.fechaDesde"
                   class="input-field">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
            <input type="date" 
                   [(ngModel)]="filters.fechaHasta"
                   class="input-field">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
            <input type="text" 
                   [(ngModel)]="filters.concepto"
                   placeholder="Buscar en concepto..."
                   class="input-field">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select [(ngModel)]="filters.categoria" class="input-field">
              <option value="">Todas las categorías</option>
              <option *ngFor="let cat of categories" [value]="cat.nombre">
                {{ cat.nombre }}
              </option>
            </select>
          </div>
        </div>
        <div class="flex justify-end space-x-2 mt-4">
          <button (click)="clearFilters()" class="btn-secondary cursor-pointer">
            Limpiar
          </button>
          <button (click)="applyFilters()" class="btn-primary cursor-pointer">
            Aplicar Filtros
          </button>
        </div>
      </div>

      <!-- Contenido Principal -->
      <div class="card">
        <!-- Pestañas -->
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              (click)="activeTab = 'list'"
              [class]="activeTab === 'list' 
                ? 'border-primary-500 text-primary-600 border-b-2 py-4 px-1 text-sm font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-4 px-1 text-sm font-medium'"
            >
              Lista de Movimientos
            </button>
            <button
              (click)="activeTab = 'ranking'"
              [class]="activeTab === 'ranking'
                ? 'border-primary-500 text-primary-600 border-b-2 py-4 px-1 text-sm font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 py-4 px-1 text-sm font-medium'"
            >
              Ranking por Conceptos
            </button>
          </nav>
        </div>

        <!-- Resumen de transacciones filtradas -->
        <div *ngIf="filters.concepto && activeTab === 'list'" class="mt-4 bg-blue-50 border-blue-200 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-medium text-blue-900">
                Resumen de transacciones con "{{ filters.concepto }}"
              </h3>
              <p class="text-sm text-blue-700 mt-1">
                {{ transactions.length }} transacciones encontradas
              </p>
            </div>
            <div class="text-right">
              <div class="text-lg font-medium text-blue-900">
                Total: {{ getTotalAmount() | currency:'EUR':'symbol':'1.2-2':'es' }}
              </div>
              <div class="text-sm text-blue-700">
                Media: {{ getAverageAmount() | currency:'EUR':'symbol':'1.2-2':'es' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Vista de Lista -->
        <div *ngIf="activeTab === 'list'" class="mt-4">
          <!-- Selector de elementos por página -->
          <div class="flex justify-end mb-4">
            <div class="flex items-center space-x-2">
              <label class="text-sm text-gray-600">Elementos por página:</label>
              <select [(ngModel)]="pageSize" 
                      (change)="onPageSizeChange()"
                      class="input-field py-1 pl-2 pr-8 text-sm">
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th (click)="sortBy('fecha')" 
                      class="table-header cursor-pointer group">
                    <div class="flex items-center">
                      Fecha
                      <span class="ml-2">
                        <svg [class]="sortColumn === 'fecha' ? 'h-5 w-5' : 'h-5 w-5 text-gray-200 group-hover:text-gray-400'" 
                             [class.rotate-180]="sortColumn === 'fecha' && sortDirection === 'asc'"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </th>
                  <th (click)="sortBy('concepto')" 
                      class="table-header cursor-pointer group">
                    <div class="flex items-center">
                      Concepto
                      <span class="ml-2">
                        <svg [class]="sortColumn === 'concepto' ? 'h-5 w-5' : 'h-5 w-5 text-gray-200 group-hover:text-gray-400'" 
                             [class.rotate-180]="sortColumn === 'concepto' && sortDirection === 'asc'"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </th>
                  <th (click)="sortBy('importe')" 
                      class="table-header cursor-pointer group">
                    <div class="flex items-center">
                      Importe
                      <span class="ml-2">
                        <svg [class]="sortColumn === 'importe' ? 'h-5 w-5' : 'h-5 w-5 text-gray-200 group-hover:text-gray-400'" 
                             [class.rotate-180]="sortColumn === 'importe' && sortDirection === 'asc'"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </th>
                  <th (click)="sortBy('balance')" 
                      class="table-header cursor-pointer group">
                    <div class="flex items-center">
                      Balance
                      <span class="ml-2">
                        <svg [class]="sortColumn === 'balance' ? 'h-5 w-5' : 'h-5 w-5 text-gray-200 group-hover:text-gray-400'" 
                             [class.rotate-180]="sortColumn === 'balance' && sortDirection === 'asc'"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </th>
                  <th (click)="sortBy('categoria')" 
                      class="table-header cursor-pointer group">
                    <div class="flex items-center">
                      Categoría
                      <span class="ml-2">
                        <svg [class]="sortColumn === 'categoria' ? 'h-5 w-5' : 'h-5 w-5 text-gray-200 group-hover:text-gray-400'" 
                             [class.rotate-180]="sortColumn === 'categoria' && sortDirection === 'asc'"
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </th>
                  <th class="table-header">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let transaction of transactions" 
                    class="hover:bg-gray-50">
                  <td class="table-cell">
                    <div class="flex flex-col">
                      <span>{{ transaction.fecha | date:'dd/MM/yyyy' }}</span>
                      <span class="text-xs text-gray-500">{{ transaction.hora }}</span>
                    </div>
                  </td>
                  <td class="table-cell">
                    <div class="max-w-xs truncate" [title]="transaction.concepto">
                      {{ transaction.concepto }}
                    </div>
                  </td>
                  <td class="table-cell">
                    <div class="flex items-center justify-end">
                      <span [class]="transaction.importe >= 0 ? 'text-success-600 font-medium' : 'text-danger-600 font-medium'">
                        {{ transaction.importe | currency:'EUR':'symbol':'1.2-2':'es' }}
                      </span>
                      <span *ngIf="transaction.importe >= 0" class="ml-2 text-success-500">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </span>
                      <span *ngIf="transaction.importe < 0" class="ml-2 text-danger-500">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </span>
                    </div>
                  </td>
                  <td class="table-cell">
                    <span [class]="transaction.balance >= 0 ? 'text-success-600' : 'text-danger-600'">
                      {{ transaction.balance | currency:'EUR':'symbol':'1.2-2':'es' }}
                    </span>
                  </td>
                  <td class="table-cell">
                    <div class="flex items-center space-x-2">
                      <span *ngIf="transaction?.categoria" 
                            [class]="'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' + 
                                    (transaction.isValidated ? 'bg-primary-100 text-primary-800' : 'bg-yellow-100 text-yellow-800')">
                        {{ transaction?.categoria }}
                        <span *ngIf="!transaction.isValidated" class="ml-1 bg-yellow-200 px-1 rounded" title="Categoría pendiente de validar">
                          ⚠️ Por validar
                        </span>
                      </span>
                      <span *ngIf="!transaction?.categoria" 
                            class="text-gray-400 text-sm">
                        Sin categorizar
                      </span>
                    </div>
                  </td>
                  <td class="table-cell">
                    <div class="flex items-center space-x-2">
                      <button (click)="editCategory(transaction)" 
                              class="text-primary-600 hover:text-primary-900 text-sm font-medium cursor-pointer">
                        Editar
                      </button>
                      <button *ngIf="transaction?.categoria && !transaction.isValidated"
                              (click)="validateCategory(transaction)"
                              class="flex items-center space-x-1 text-yellow-600 hover:text-yellow-800 text-sm font-medium cursor-pointer bg-yellow-50 px-2 py-1 rounded">
                        <span>⚠️</span>
                        <span>Validar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Vista de Ranking -->
        <div *ngIf="activeTab === 'ranking'" class="mt-4 space-y-8">
          <!-- Ranking de Gastos -->
          <div class="card">
            <h3 class="text-lg font-medium text-danger-900 mb-4">Top 5 Gastos</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead>
                  <tr>
                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-900">#</th>
                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-900">Concepto</th>
                    <th class="px-4 py-2 text-right text-sm font-medium text-gray-900">Nº Movimientos</th>
                    <th class="px-4 py-2 text-right text-sm font-medium text-gray-900">Total</th>
                    <th class="px-4 py-2 text-right text-sm font-medium text-gray-900">Media</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr *ngFor="let item of getConceptRanking().gastos; let i = index" 
                      class="hover:bg-gray-100 cursor-pointer"
                      (click)="filters.concepto = item.concepto; applyFilters(); activeTab = 'list'">
                    <td class="px-4 py-2 text-sm text-gray-900">{{ i + 1 }}</td>
                    <td class="px-4 py-2 text-sm text-gray-900">{{ item.concepto }}</td>
                    <td class="px-4 py-2 text-sm text-gray-900 text-right">{{ item.count }}</td>
                    <td class="px-4 py-2 text-sm text-danger-600 text-right font-medium">
                      {{ item.total | currency:'EUR':'symbol':'1.2-2':'es' }}
                    </td>
                    <td class="px-4 py-2 text-sm text-gray-900 text-right">
                      {{ item.mediaImporte | currency:'EUR':'symbol':'1.2-2':'es' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Ranking de Ingresos -->
          <div class="card">
            <h3 class="text-lg font-medium text-success-900 mb-4">Top 5 Ingresos</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead>
                  <tr>
                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-900">#</th>
                    <th class="px-4 py-2 text-left text-sm font-medium text-gray-900">Concepto</th>
                    <th class="px-4 py-2 text-right text-sm font-medium text-gray-900">Nº Movimientos</th>
                    <th class="px-4 py-2 text-right text-sm font-medium text-gray-900">Total</th>
                    <th class="px-4 py-2 text-right text-sm font-medium text-gray-900">Media</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr *ngFor="let item of getConceptRanking().ingresos; let i = index" 
                      class="hover:bg-gray-100 cursor-pointer"
                      (click)="filters.concepto = item.concepto; applyFilters(); activeTab = 'list'">
                    <td class="px-4 py-2 text-sm text-gray-900">{{ i + 1 }}</td>
                    <td class="px-4 py-2 text-sm text-gray-900">{{ item.concepto }}</td>
                    <td class="px-4 py-2 text-sm text-gray-900 text-right">{{ item.count }}</td>
                    <td class="px-4 py-2 text-sm text-success-600 text-right font-medium">
                      {{ item.total | currency:'EUR':'symbol':'1.2-2':'es' }}
                    </td>
                    <td class="px-4 py-2 text-sm text-gray-900 text-right">
                      {{ item.mediaImporte | currency:'EUR':'symbol':'1.2-2':'es' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Paginación (solo en vista de lista) -->
        <div *ngIf="activeTab === 'list'" class="mt-4 flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Mostrando {{ transactions.length }} de {{ totalTransactions }} movimientos
          </div>
          <div class="flex space-x-2">
            <button (click)="previousPage()" 
                    [disabled]="currentPage === 1"
                    class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              Anterior
            </button>
            <span class="px-3 py-2 text-sm text-gray-700">
              Página {{ currentPage }} de {{ totalPages }}
            </span>
            <button (click)="nextPage()" 
                    [disabled]="currentPage === totalPages"
                    class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para editar categoría -->
    <div *ngIf="showEditModal" 
         class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Editar Categoría
          </h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select [(ngModel)]="editingTransaction.categoria" class="input-field">
              <option value="">Seleccionar categoría</option>
              <option *ngFor="let cat of categories" [value]="cat.nombre">
                {{ cat.nombre }}
              </option>
            </select>
          </div>
          <!-- Sugerencia de IA -->
          <div *ngIf="aiSuggestion" class="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-blue-900">Sugerencia de la IA</h4>
              <span class="text-xs text-blue-700">
                Confianza: {{ (aiSuggestion.confidence * 100).toFixed(1) }}%
              </span>
            </div>
            <p class="text-sm text-blue-800 mb-2">
              {{ aiSuggestion.explanation }}
            </p>
            <div class="text-xs text-blue-600">
              Palabras clave: {{ aiSuggestion.keywords.join(', ') }}
            </div>
          </div>

          <div class="flex justify-between space-x-2">
            <button (click)="suggestCategory()" 
                    class="btn-secondary flex items-center space-x-1 cursor-pointer">
              <span>🤖</span>
              <span>Sugerir con IA</span>
            </button>
            <div class="flex space-x-2">
              <button (click)="cancelEdit()" class="btn-secondary cursor-pointer">
                Cancelar
              </button>
              <button (click)="saveCategory()" class="btn-primary cursor-pointer">
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TransactionsComponent implements OnInit {
  transactions: (Transaction & { isValidated?: boolean })[] = [];
  categories: any[] = [];
  filters: TransactionFilters = {};
  selectedMonth: Date;
  validatedConcepts: Set<string> = new Set();

  // Ordenación
  sortColumn: string = 'fecha';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Paginación
  currentPage = 1;
  pageSize = 50;
  totalTransactions = 0;
  totalPages = 0;
  readonly pageSizeOptions = [10, 25, 50, 100];

  // Control de pestañas
  activeTab: 'list' | 'ranking' = 'list';

  // Modal de edición
  showEditModal = false;
  editingTransaction: Transaction = {
    id: 0,
    fecha: '',
    hora: '00:00',
    concepto: '',
    importe: 0,
    balance: 0,
    categoria: '',
    notas: ''
  };

  // Sugerencia de IA
  aiSuggestion: {
    category_id: number;
    confidence: number;
    keywords: string[];
    explanation: string;
  } | null = null;

  constructor(private transactionService: TransactionService) {
    // Inicializar propiedades
    this.transactions = [];
    this.categories = [];
    this.filters = {};
    
    // Inicializar con el mes guardado o el mes actual
    const savedMonth = localStorage.getItem('selectedMonth');
    this.selectedMonth = savedMonth ? new Date(savedMonth) : new Date(new Date().setMonth(new Date().getMonth() - 1));

    // Recuperar el tamaño de página guardado
    const savedPageSize = localStorage.getItem('pageSize');
    if (savedPageSize && this.pageSizeOptions.includes(Number(savedPageSize))) {
      this.pageSize = Number(savedPageSize);
    }
  }

  ngOnInit(): void {
    // Inicializar con el mes actual
    this.loadValidatedConcepts();
    this.onMonthChange(this.selectedMonth);
    this.loadCategories();
  }

  loadValidatedConcepts(): void {
    this.transactionService.getValidatedConcepts().subscribe({
      next: (concepts) => {
        console.log('Conceptos validados cargados:', concepts);
        this.validatedConcepts = new Set(concepts);
        // Si ya hay transacciones cargadas, actualizar su estado de validación
        if (this.transactions.length > 0) {
          this.updateTransactionsValidationStatus();
        }
      },
      error: (error) => {
        console.error('Error al cargar conceptos validados:', error);
      }
    });
  }

  updateTransactionsValidationStatus(): void {
    this.transactions.forEach(tx => {
      tx.isValidated = this.validatedConcepts.has(tx.concepto);
      console.log(`Concepto: ${tx.concepto}, Categoría: ${tx.categoria}, Validado: ${tx.isValidated}`);
    });
  }

  validateCategory(transaction: Transaction): void {
    if (!transaction.categoria) return;
    
    this.transactionService.updateTransactionCategory(
      transaction.id,
      transaction.categoria
    ).subscribe({
      next: (response) => {
        // Actualizar el conjunto de conceptos validados
        this.validatedConcepts.add(transaction.concepto);
        this.updateTransactionsValidationStatus();
        
        console.log(`✅ Categoría validada para ${response.totalUpdated} transacciones`);
      },
      error: (error) => {
        console.error('Error al validar categoría:', error);
      }
    });
  }

  onMonthChange(date: Date): void {
    this.selectedMonth = date;
    
    // Formatear el primer día del mes (siempre 01)
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const startStr = `${date.getFullYear()}-${month}-01`;
    
    // Calcular el último día según el mes
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const endStr = `${date.getFullYear()}-${month}-${lastDay}`;
    
    // Actualizar los filtros
    this.filters = {
      ...this.filters,  // Mantener otros filtros
      fechaDesde: startStr,
      fechaHasta: endStr
    };
    
    console.log('Filtros actualizados:', {
      mes: date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      desde: startStr,  // Debería ser YYYY-MM-01
      hasta: endStr     // Debería ser YYYY-MM-31 (o 30, 28, 29 según el mes)
    });

    console.log('Fechas actualizadas:', {
      mes: date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      desde: startStr,
      hasta: endStr
    });

    this.currentPage = 1; // Resetear la paginación
    this.loadTransactions();
  }

  sortBy(column: string): void {
    // Si hacemos clic en la misma columna, cambiamos la dirección
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Si es una columna diferente, establecemos la nueva columna y dirección desc por defecto
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    
    // Resetear la paginación al ordenar
    this.currentPage = 1;
    this.loadTransactions();
  }

  loadTransactions(): void {
    console.log('🔄 Cargando transacciones...', this.filters);
    
    // Agregar parámetros de paginación y ordenación a los filtros
    const filtersWithPagination = {
      ...this.filters,
      page: this.currentPage.toString(),
      limit: this.pageSize.toString(),
      sortBy: this.sortColumn,
      sortDirection: this.sortDirection
    };
    
    console.log('Enviando filtros con ordenación:', filtersWithPagination);
    
    this.transactionService.getTransactions(filtersWithPagination).subscribe({
      next: (response) => {
        console.log('✅ Transacciones cargadas:', response);
        this.transactions = response.transactions;
        this.updateTransactionsValidationStatus();
        this.totalTransactions = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.currentPage = response.pagination.page;
      },
      error: (error) => {
        console.error('❌ Error al cargar transacciones:', error);
      }
    });
  }

  loadCategories(): void {
    console.log('🔄 Cargando categorías...');
    this.transactionService.getCategories().subscribe({
      next: (data) => {
        console.log('✅ Categorías cargadas:', data);
        this.categories = data;
      },
      error: (error) => {
        console.error('❌ Error al cargar categorías:', error);
      }
    });
  }

  applyFilters(): void {
    // Limpiar espacios en blanco de los filtros de texto
    if (this.filters.categoria) {
      this.filters.categoria = this.filters.categoria.trim();
    }
    if (this.filters.concepto) {
      this.filters.concepto = this.filters.concepto.trim();
    }

    this.currentPage = 1;
    this.loadTransactions();
  }

  clearFilters(): void {
    // Limpiar todos los filtros excepto las fechas
    const { fechaDesde, fechaHasta } = this.filters;
    this.filters = { fechaDesde, fechaHasta };
    
    this.currentPage = 1;
    this.loadTransactions();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTransactions();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTransactions();
    }
  }

  onPageSizeChange(): void {
    // Guardar la preferencia del usuario
    localStorage.setItem('pageSize', this.pageSize.toString());
    
    // Resetear a la primera página y recargar
    this.currentPage = 1;
    this.loadTransactions();
  }

  editCategory(transaction: Transaction): void {
    this.editingTransaction = { ...transaction };
    this.showEditModal = true;
    this.aiSuggestion = null; // Limpiar sugerencia anterior
  }

  // Solicitar sugerencia de categoría a la IA
  suggestCategory(): void {
    console.log('🤖 Solicitando sugerencia para:', this.editingTransaction.concepto);
    
    this.transactionService.suggestCategory(
      this.editingTransaction.concepto,
      this.editingTransaction.importe
    ).subscribe({
      next: (suggestion) => {
        console.log('✅ Sugerencia recibida:', suggestion);
        this.aiSuggestion = suggestion;

        // Buscar la categoría correspondiente
        const category = this.categories.find(c => c.id === suggestion.category_id);
        if (category) {
          console.log('📝 Actualizando categoría a:', category.nombre);
          this.editingTransaction.categoria = category.nombre;
        }
      },
      error: (error) => {
        console.error('❌ Error al obtener sugerencia:', error);
      }
    });
  }

  cancelEdit(): void {
    this.showEditModal = false;
    this.aiSuggestion = null;
    this.editingTransaction = {
      id: 0,
      fecha: '',
      hora: '00:00',
      concepto: '',
      importe: 0,
      balance: 0,
      categoria: '',
      notas: ''
    };
  }

  saveCategory(): void {
    if (!this.editingTransaction.id) return;

    this.transactionService.updateTransactionCategory(
      this.editingTransaction.id,
      this.editingTransaction.categoria || ''
    ).subscribe({
      next: (response) => {
        this.showEditModal = false;
        this.editingTransaction = {
          id: 0,
          fecha: '',
          hora: '00:00',
          concepto: '',
          importe: 0,
          balance: 0,
          categoria: '',
          notas: ''
        };
        
        // Mostrar mensaje de éxito
        console.log(`✅ Categoría actualizada en ${response.totalUpdated} transacciones`);
        
        // Recargar transacciones para mostrar los cambios
        this.loadTransactions();
      },
      error: (error) => {
        console.error('Error al actualizar categoría:', error);
      }
    });
  }

  // Calcular el total de importes de las transacciones filtradas
  getTotalAmount(): number {
    return this.transactions.reduce((sum, transaction) => sum + transaction.importe, 0);
  }

  // Calcular la media de importes de las transacciones filtradas
  getAverageAmount(): number {
    if (this.transactions.length === 0) return 0;
    return this.getTotalAmount() / this.transactions.length;
  }

  // Calcular el ranking de conceptos separado por gastos e ingresos
  getConceptRanking() {
    // Separar transacciones en gastos e ingresos
    const gastos = this.transactions.filter(tx => tx.importe < 0);
    const ingresos = this.transactions.filter(tx => tx.importe > 0);

    // Función auxiliar para agrupar conceptos
    const groupConcepts = (transactions: Transaction[]) => {
      const groups = transactions.reduce((acc, tx) => {
        // Usar el concepto como clave, eliminando números y caracteres especiales
        const key = tx.concepto.replace(/[\d-]/g, '').trim();
        
        if (!acc[key]) {
          acc[key] = {
            concepto: key,
            total: 0,
            count: 0,
            mediaImporte: 0
          };
        }
        acc[key].total += Math.abs(tx.importe);
        acc[key].count++;
        acc[key].mediaImporte = acc[key].total / acc[key].count;
        return acc;
      }, {} as {[key: string]: {concepto: string, total: number, count: number, mediaImporte: number}});

      // Convertir a array y ordenar por total
      return Object.values(groups)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5); // Top 5
    };

    return {
      gastos: groupConcepts(gastos),
      ingresos: groupConcepts(ingresos)
    };
  }
}