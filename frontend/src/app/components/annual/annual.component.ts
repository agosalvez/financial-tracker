import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';
import { AccountService } from '../../services/account.service';
import { YearSelectorComponent } from '../shared/year-selector.component';
import { AnnualData } from '../../models/annual-data.model';
import { Transaction, TransactionFilters, Category } from '../../models/transaction.model';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

// Registrar los componentes necesarios de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-annual',
  standalone: true,
  imports: [CommonModule, YearSelectorComponent, FormsModule],
  template: `
    <div class="space-y-6 p-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900">Resumen Anual</h1>
        <app-year-selector
          [currentYear]="selectedYear"
          (yearChange)="onYearChange($event)">
        </app-year-selector>
      </div>

      <!-- Resumen General -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-700">Gasto Total</h3>
          <p class="text-2xl font-bold text-danger-600">
            {{ annualData?.resumen?.gastoTotal | currency:'EUR':'symbol':'1.2-2':'es' }}
          </p>
          <p class="text-sm text-gray-500" *ngIf="annualData?.resumen?.variacionAnual !== undefined">
            {{ annualData?.resumen?.variacionAnual! > 0 ? '↑' : '↓' }}
            {{ Math.abs(annualData?.resumen?.variacionAnual!).toFixed(1) }}% vs año anterior
          </p>
        </div>

        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-700">Saldo Promedio</h3>
          <p class="text-2xl font-bold" [class]="(annualData?.resumen?.saldoPromedio || 0) >= 0 ? 'text-success-600' : 'text-danger-600'">
            {{ annualData?.resumen?.saldoPromedio | currency:'EUR':'symbol':'1.2-2':'es' }}
          </p>
        </div>

        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-700">Mes con Más Gastos</h3>
          <p class="text-2xl font-bold text-danger-600">
            {{ annualData?.resumen?.mesMaxGasto?.mes }}
          </p>
          <p class="text-sm text-gray-500">
            {{ annualData?.resumen?.mesMaxGasto?.total | currency:'EUR':'symbol':'1.2-2':'es' }}
          </p>
        </div>

        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-700">Mes con Menos Gastos</h3>
          <p class="text-2xl font-bold text-success-600">
            {{ annualData?.resumen?.mesMinGasto?.mes }}
          </p>
          <p class="text-sm text-gray-500">
            {{ annualData?.resumen?.mesMinGasto?.total | currency:'EUR':'symbol':'1.2-2':'es' }}
          </p>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Gastos por Categoría -->
        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Gastos por Categoría</h3>
          <canvas #categoryChartCanvas></canvas>
        </div>

        <!-- Evolución del Saldo -->
        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Evolución del Saldo</h3>
          <canvas #saldoChartCanvas></canvas>
        </div>

        <!-- Evolución de Gastos -->
        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Evolución de Gastos</h3>
          <canvas #gastosChartCanvas></canvas>
        </div>
      </div>

      <!-- Comparativa con Año Anterior -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Categorías con Mayor Aumento -->
        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Mayor Aumento vs Año Anterior</h3>
          <div class="space-y-4">
            <div *ngFor="let cat of annualData?.comparativa?.categoriasMasAumento" 
                 class="flex items-center justify-between">
              <span class="font-medium">{{ cat.categoria }}</span>
              <span class="text-danger-600">
                +{{ cat.variacion.toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Categorías con Mayor Reducción -->
        <div class="card p-4">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Mayor Reducción vs Año Anterior</h3>
          <div class="space-y-4">
            <div *ngFor="let cat of annualData?.comparativa?.categoriasMasReduccion" 
                 class="flex items-center justify-between">
              <span class="font-medium">{{ cat.categoria }}</span>
              <span class="text-success-600">
                {{ cat.variacion.toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Movimientos del Año -->
      <div class="card p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold text-gray-900">Todos los Movimientos del {{ selectedYear }}</h3>
          <div class="text-sm text-gray-500">
            Total: {{ filteredTransactions.length }} movimientos
          </div>
        </div>

        <!-- Resumen de totales filtrados -->
        <div *ngIf="filteredTransactions.length > 0" class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">
                {{ getTotalIngresos() | currency:'EUR':'symbol':'1.2-2':'es' }}
              </div>
              <div class="text-sm text-blue-700 font-medium">Total Ingresos</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-red-600">
                {{ getTotalGastos() | currency:'EUR':'symbol':'1.2-2':'es' }}
              </div>
              <div class="text-sm text-red-700 font-medium">Total Gastos</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold" [class]="getBalanceFiltrado() >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ getBalanceFiltrado() | currency:'EUR':'symbol':'1.2-2':'es' }}
              </div>
              <div class="text-sm font-medium" [class]="getBalanceFiltrado() >= 0 ? 'text-green-700' : 'text-red-700'">
                Balance Filtrado
              </div>
            </div>
          </div>
        </div>

        <!-- Filtros -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Buscar por concepto</label>
            <input 
              type="text" 
              [(ngModel)]="filters.concepto"
              (input)="applyFilters()"
              placeholder="Ej: supermercado, gasolina..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select 
              [(ngModel)]="filters.categoria"
              (change)="applyFilters()"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas las categorías</option>
              <option *ngFor="let category of categories" [value]="category.nombre">
                {{ category.nombre }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Importe mínimo</label>
            <input 
              type="number" 
              [(ngModel)]="filters.importeMin"
              (input)="onImporteMinChange($event)"
              placeholder="0.00"
              step="0.01"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Importe máximo</label>
            <input 
              type="number" 
              [(ngModel)]="filters.importeMax"
              (input)="onImporteMaxChange($event)"
              placeholder="1000.00"
              step="0.01"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>
        </div>

        <!-- Tabla de transacciones -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" 
                    (click)="sortByColumn('fecha')">
                  Fecha
                  <span *ngIf="sortBy === 'fecha'">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    (click)="sortByColumn('concepto')">
                  Concepto
                  <span *ngIf="sortBy === 'concepto'">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    (click)="sortByColumn('categoria')">
                  Categoría
                  <span *ngIf="sortBy === 'categoria'">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    (click)="sortByColumn('importe')">
                  Importe
                  <span *ngIf="sortBy === 'importe'">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }}
                  </span>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let transaction of filteredTransactions" 
                  class="hover:bg-gray-50 transition-colors duration-150">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ transaction.fecha | date:'dd/MM/yyyy' }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  <div class="max-w-xs truncate" [title]="transaction.concepto">
                    {{ transaction.concepto }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        [class]="getCategoryColor(transaction.categoria || '')">
                    {{ transaction.categoria || 'Sin categorizar' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium"
                    [class]="transaction.importe >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ transaction.importe | currency:'EUR':'symbol':'1.2-2':'es' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ transaction.balance | currency:'EUR':'symbol':'1.2-2':'es' }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Mensaje cuando no hay transacciones -->
          <div *ngIf="filteredTransactions.length === 0" class="text-center py-8">
            <div class="text-gray-500">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">No hay movimientos</h3>
              <p class="mt-1 text-sm text-gray-500">
                No se encontraron transacciones con los filtros aplicados.
              </p>
            </div>
          </div>
        </div>

        <!-- Paginación -->
        <div *ngIf="pagination.totalPages > 1" class="mt-6 flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Mostrando {{ (pagination.page - 1) * pagination.limit + 1 }} a 
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} de 
            {{ pagination.total }} resultados
          </div>
          <div class="flex space-x-2">
            <button 
              (click)="changePage(pagination.page - 1)"
              [disabled]="pagination.page <= 1"
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Anterior
            </button>
            <span class="px-3 py-2 text-sm font-medium text-gray-700">
              Página {{ pagination.page }} de {{ pagination.totalPages }}
            </span>
            <button 
              (click)="changePage(pagination.page + 1)"
              [disabled]="pagination.page >= pagination.totalPages"
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .card {
      @apply bg-white rounded-lg shadow;
    }
  `]
})
export class AnnualComponent implements OnInit, AfterViewInit {
  @ViewChild('categoryChartCanvas') categoryChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('saldoChartCanvas') saldoChartCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('gastosChartCanvas') gastosChartCanvas?: ElementRef<HTMLCanvasElement>;

  selectedYear: number = new Date().getFullYear();
  annualData?: AnnualData;
  Math = Math; // Para usar Math en el template

  // Propiedades para la tabla de transacciones
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  categories: Category[] = [];
  
  // Filtros
  filters: TransactionFilters = {
    fechaDesde: '',
    fechaHasta: '',
    concepto: '',
    categoria: '',
    importeMin: undefined,
    importeMax: undefined,
    page: '1',
    limit: '50',
    sortBy: 'fecha',
    sortDirection: 'desc'
  };

  // Paginación
  pagination = {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  };

  // Ordenamiento
  sortBy: string = 'fecha';
  sortDirection: 'asc' | 'desc' = 'desc';

  private categoryChart?: Chart;
  private saldoChart?: Chart;
  private gastosChart?: Chart;
  private selectedAccount: string | null = null;
  private subscriptions = new Subscription();

  constructor(
    private transactionService: TransactionService,
    private accountService: AccountService
  ) {}

  ngOnInit() {
    // Obtener cuenta seleccionada actual
    this.selectedAccount = this.accountService.getSelectedAccount();
    if (this.selectedAccount) {
      this.filters.banco = this.selectedAccount;
    }

    // Suscribirse a cambios en la cuenta seleccionada
    this.subscriptions.add(
      this.accountService.selectedAccount$.subscribe(account => {
        console.log('🔄 Annual: Cambio de cuenta detectado:', account);
        this.selectedAccount = account;
        // Actualizar filtro de banco
        if (account) {
          this.filters.banco = account;
        } else {
          this.filters.banco = undefined;
        }
        // Recargar datos cuando cambia la cuenta
        if (this.selectedYear) {
          this.loadAnnualData(this.selectedYear);
          this.loadTransactions(); // También recargar transacciones
        }
      })
    );

    this.loadDataSequentially();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private loadDataSequentially() {
    // Cargar datos en secuencia para evitar rate limiting
    this.loadAnnualData(this.selectedYear);
    
    // Cargar categorías después de un pequeño delay
    setTimeout(() => {
      this.loadCategories();
    }, 100);
    
    // Configurar filtros después de otro delay
    setTimeout(() => {
      this.setupYearFilters();
    }, 200);
  }

  ngAfterViewInit() {
    if (this.annualData) {
      this.updateCharts();
    }
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.loadAnnualData(year);
    this.setupYearFilters();
    this.loadTransactions();
  }

  private loadAnnualData(year: number) {
    console.log('📊 Cargando datos anuales para el año:', year, 'Banco:', this.selectedAccount);
    this.transactionService.getAnnualData(year, this.selectedAccount || undefined).subscribe({
      next: (data) => {
        console.log('✅ Datos anuales cargados:', data);
        this.annualData = data;
        if (this.categoryChartCanvas && this.saldoChartCanvas && this.gastosChartCanvas) {
          this.updateCharts();
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar datos anuales:', error);
        // Mostrar mensaje de error al usuario
        this.annualData = undefined;
      }
    });
  }

  private updateCharts() {
    if (!this.annualData || !this.categoryChartCanvas || !this.saldoChartCanvas || !this.gastosChartCanvas) return;

    // Destruir gráficos existentes
    this.categoryChart?.destroy();
    this.saldoChart?.destroy();
    this.gastosChart?.destroy();

    // Configurar gráfico de categorías
    this.categoryChart = new Chart(this.categoryChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.annualData.gastosPorCategoria.map(cat => cat.categoria),
        datasets: [{
          label: 'Gastos',
          data: this.annualData.gastosPorCategoria.map(cat => cat.total),
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(value);
              }
            }
          }
        }
      }
    });

    // Configurar gráfico de saldo mensual
    this.saldoChart = new Chart(this.saldoChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.annualData.evolucionMensual.map(m => m.mesNombre),
        datasets: [
          {
            label: 'Saldo',
            data: this.annualData.evolucionMensual.map(m => m.saldo),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `Saldo: ${new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(value)}`;
              }
            }
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Saldo'
            },
            ticks: {
              callback: (value) => {
                return new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(value as number);
              }
            }
          }
        }
      }
    });

    // Configurar gráfico de gastos mensuales
    this.gastosChart = new Chart(this.gastosChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.annualData.evolucionMensual.map(m => m.mesNombre),
        datasets: [
          {
            label: 'Gastos',
            data: this.annualData.evolucionMensual.map(m => m.gastos),
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `Gastos: ${new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(value)}`;
              }
            }
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Gastos'
            },
            ticks: {
              callback: (value) => {
                return new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(value as number);
              }
            }
          }
        }
      }
    });
  }

  // Métodos para la tabla de transacciones
  private setupYearFilters() {
    this.filters.fechaDesde = `${this.selectedYear}-01-01`;
    this.filters.fechaHasta = `${this.selectedYear}-12-31`;
    this.filters.page = '1';
    // Asegurarse de que el filtro de banco esté aplicado
    if (this.selectedAccount) {
      this.filters.banco = this.selectedAccount;
    }
    this.loadTransactions();
  }

  private loadCategories() {
    console.log('Cargando categorías...');
    this.transactionService.getCategories().subscribe({
      next: (categories) => {
        console.log('Categorías cargadas:', categories);
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.categories = [];
      }
    });
  }

  private loadTransactions() {
    // Asegurarse de que el filtro de banco esté aplicado
    if (this.selectedAccount && !this.filters.banco) {
      this.filters.banco = this.selectedAccount;
    } else if (!this.selectedAccount && this.filters.banco) {
      this.filters.banco = undefined;
    }

    console.log('📋 Annual: Cargando transacciones con filtros:', {
      banco: this.filters.banco,
      fechaDesde: this.filters.fechaDesde,
      fechaHasta: this.filters.fechaHasta,
      otrosFiltros: this.filters
    });
    
    this.transactionService.getTransactions(this.filters).subscribe({
      next: (response) => {
        console.log('✅ Annual: Transacciones cargadas:', {
          total: response.pagination.total,
          count: response.transactions.length,
          banco: this.filters.banco
        });
        this.transactions = response.transactions;
        this.filteredTransactions = response.transactions;
        this.pagination = response.pagination;
      },
      error: (error) => {
        console.error('❌ Error al cargar transacciones:', error);
        this.transactions = [];
        this.filteredTransactions = [];
      }
    });
  }

  applyFilters() {
    this.filters.page = '1';
    this.loadTransactions();
  }

  onImporteMinChange(event: any) {
    const value = event.target.value;
    if (value === '' || value === null) {
      this.filters.importeMin = undefined;
    } else {
      const numValue = parseFloat(value);
      this.filters.importeMin = isNaN(numValue) ? undefined : numValue;
    }
    this.applyFilters();
  }

  onImporteMaxChange(event: any) {
    const value = event.target.value;
    if (value === '' || value === null) {
      this.filters.importeMax = undefined;
    } else {
      const numValue = parseFloat(value);
      this.filters.importeMax = isNaN(numValue) ? undefined : numValue;
    }
    this.applyFilters();
  }

  sortByColumn(column: string) {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
    
    this.filters.sortBy = column;
    this.filters.sortDirection = this.sortDirection;
    this.loadTransactions();
  }

  changePage(page: number) {
    this.filters.page = page.toString();
    this.loadTransactions();
  }

  getCategoryColor(categoria: string): string {
    if (!categoria) return 'bg-gray-100 text-gray-800';
    
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-orange-100 text-orange-800'
    ];
    
    // Generar un color basado en el hash de la categoría
    let hash = 0;
    for (let i = 0; i < categoria.length; i++) {
      hash = categoria.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // Métodos para calcular totales filtrados
  getTotalIngresos(): number {
    return this.filteredTransactions
      .filter(transaction => transaction.importe > 0)
      .reduce((total, transaction) => total + transaction.importe, 0);
  }

  getTotalGastos(): number {
    return this.filteredTransactions
      .filter(transaction => transaction.importe < 0)
      .reduce((total, transaction) => total + Math.abs(transaction.importe), 0);
  }

  getBalanceFiltrado(): number {
    return this.filteredTransactions
      .reduce((total, transaction) => total + transaction.importe, 0);
  }
}