import { Component, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';
import { SummaryData } from '../../models/transaction.model';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { MonthSelectorComponent } from '../shared/month-selector.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgClass, NgChartsModule, MonthSelectorComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-6">
          <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
          <app-month-selector 
            [currentDate]="selectedMonth"
            (monthChange)="onMonthChange($event)">
          </app-month-selector>
        </div>
        <div class="text-sm text-gray-500">
          Última actualización: {{ lastUpdate | date:'dd/MM/yyyy HH:mm' }}
        </div>
      </div>

      <!-- Resumen de tarjetas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total Ingresos</p>
              <p class="text-2xl font-semibold text-success-600">{{ summary?.totalIngresos | currency:'EUR':'symbol':'1.2-2':'es' }}</p>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Total Gastos</p>
              <p class="text-2xl font-semibold text-danger-600">{{ summary?.totalGastos | currency:'EUR':'symbol':'1.2-2':'es' }}</p>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Balance</p>
              <p class="text-2xl font-semibold" [ngClass]="(summary?.balance ?? 0) >= 0 ? 'text-success-600' : 'text-danger-600'">
                {{ summary?.balance | currency:'EUR':'symbol':'1.2-2':'es' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Gráfico de gastos por categoría -->
        <div class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Gastos por Categoría</h3>
          <div class="h-64">
            <canvas baseChart
                    [data]="gastosChartData"
                    [type]="gastosChartType"
                    [options]="gastosChartOptions">
            </canvas>
          </div>
        </div>

        <!-- Gráfico de tendencia mensual -->
        <div class="card">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Tendencia Mensual</h3>
          <div class="h-64">
            <canvas baseChart
                    [data]="tendenciaChartData"
                    [type]="tendenciaChartType"
                    [options]="tendenciaChartOptions">
            </canvas>
          </div>
        </div>
      </div>

      <!-- Top categorías de gastos -->
      <div class="card">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Top 5 Categorías de Gastos</h3>
        <div class="space-y-3">
          <div *ngFor="let item of summary?.gastosPorCategoria?.slice(0, 5); let i = index" 
               class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-4 h-4 rounded-full mr-3" 
                   [style.background-color]="getCategoryColor(i)"></div>
              <span class="text-sm font-medium text-gray-900">{{ item.categoria }}</span>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold text-gray-900">{{ item.total | currency:'EUR':'symbol':'1.2-2':'es' }}</div>
              <div class="text-xs text-gray-500">{{ item.porcentaje | number:'1.1-1' }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  summary: SummaryData | undefined = undefined;
  lastUpdate = new Date();
  selectedMonth = new Date(new Date().setMonth(new Date().getMonth() - 1));

  // Configuración de gráficos
  gastosChartType: ChartType = 'doughnut';
  gastosChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderWidth: 0
    }]
  };

  gastosChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    }
  };

  tendenciaChartType: ChartType = 'line';
  tendenciaChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Ingresos',
        data: [],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      },
      {
        label: 'Gastos',
        data: [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }
    ]
  };

  tendenciaChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR'
            }).format(value as number);
          }
        }
      }
    }
  };

  constructor(private transactionService: TransactionService) { }

  ngOnInit(): void {
    this.loadSummary();
  }

  onMonthChange(date: Date): void {
    this.selectedMonth = date;
    this.loadSummary();
  }

  loadSummary(): void {
    const month = this.selectedMonth.getMonth() + 1;
    const year = this.selectedMonth.getFullYear();
    const monthName = this.selectedMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    console.log(`🔄 Cargando resumen para ${monthName}`);
    
    this.transactionService.getSummary({
      month: month,
      year: year
    }).subscribe({
      next: (data) => {
        console.log('✅ Resumen cargado:', data);
        this.summary = data;
        this.updateCharts();
        this.lastUpdate = new Date();
      },
      error: (error) => {
        console.error('❌ Error al cargar el resumen:', error);
      }
    });
  }

  updateCharts(): void {
    if (!this.summary) return;

    // Actualizar gráfico de gastos por categoría
    this.gastosChartData = {
      labels: this.summary.gastosPorCategoria.map(item => item.categoria),
      datasets: [{
        data: this.summary.gastosPorCategoria.map(item => item.total),
        backgroundColor: this.summary.gastosPorCategoria.map((_, index) => this.getCategoryColor(index)),
        borderWidth: 0
      }]
    };

    // Actualizar gráfico de saldo diario
    this.tendenciaChartData = {
      labels: this.summary.tendenciaMensual.map(item => item.dia),
      datasets: [
        {
          label: 'Saldo',
          data: this.summary.tendenciaMensual.map(item => item.balance),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.2,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2
        }
      ]
    };
  }

  getCategoryColor(index: number): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    return colors[index % colors.length];
  }
}
