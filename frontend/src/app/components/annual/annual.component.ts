import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';
import { YearSelectorComponent } from '../shared/year-selector.component';
import { AnnualData } from '../../models/annual-data.model';
import { Chart, registerables } from 'chart.js';

// Registrar los componentes necesarios de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-annual',
  standalone: true,
  imports: [CommonModule, YearSelectorComponent],
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

  private categoryChart?: Chart;
  private saldoChart?: Chart;
  private gastosChart?: Chart;

  constructor(private transactionService: TransactionService) {}

  ngOnInit() {
    this.loadAnnualData(this.selectedYear);
  }

  ngAfterViewInit() {
    if (this.annualData) {
      this.updateCharts();
    }
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.loadAnnualData(year);
  }

  private loadAnnualData(year: number) {
    this.transactionService.getAnnualData(year).subscribe({
      next: (data) => {
        this.annualData = data;
        if (this.categoryChartCanvas && this.saldoChartCanvas && this.gastosChartCanvas) {
          this.updateCharts();
        }
      },
      error: (error) => {
        console.error('Error al cargar datos anuales:', error);
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
}