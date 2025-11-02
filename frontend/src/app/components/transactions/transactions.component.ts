import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';
import { AccountService } from '../../services/account.service';
import { Transaction, TransactionFilters } from '../../models/transaction.model';
import { MonthSelectorComponent } from '../shared/month-selector.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, MonthSelectorComponent],
  template: `
    <div class="space-y-6">
      <!-- Mensaje si no hay cuenta seleccionada -->
      <div *ngIf="!selectedAccount" class="card bg-yellow-50 border-yellow-200 mb-6">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <div>
            <h3 class="text-sm font-medium text-yellow-900">Selecciona una cuenta</h3>
            <p class="text-sm text-yellow-800 mt-1">Por favor, selecciona una cuenta desde el menú superior para ver sus transacciones.</p>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="flex justify-between items-center" *ngIf="selectedAccount">
        <div class="flex items-center space-x-6">
          <h1 class="text-3xl font-bold text-gray-900">
            Movimientos - {{ selectedAccount }}
          </h1>
          <app-month-selector 
            [currentDate]="selectedMonth"
            (monthChange)="onMonthChange($event)">
          </app-month-selector>
        </div>
        <div class="flex items-center space-x-4">
          <div class="text-sm text-gray-500">
            {{ transactions.length }} movimientos encontrados
            <span class="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {{ selectedAccount }}
            </span>
          </div>
          <!-- Modo Edición -->
          <label class="flex items-center space-x-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <span class="text-xs">✏️ Modo Edición:</span>
            <input type="checkbox" 
                   [(ngModel)]="editMode"
                   class="sr-only peer">
            <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500 relative"></div>
            <span class="text-xs font-medium text-gray-700">
              {{ editMode ? 'ON' : 'OFF' }}
            </span>
          </label>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4" *ngIf="selectedAccount">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Selección rápida</label>
            <div class="flex items-center h-[42px]">
              <input type="checkbox" 
                     id="fullYearCheck"
                     [checked]="isFullYearSelected"
                     (change)="toggleFullYear()"
                     class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer">
              <label for="fullYearCheck" 
                     class="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                📅 Año completo
              </label>
            </div>
          </div>
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
          <!-- Botones en línea (ocultos en móviles, visibles en desktop) -->
          <div class="hidden lg:block col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
            <div class="flex space-x-2 w-full">
              <button (click)="clearFilters()" class="btn-secondary cursor-pointer text-sm py-2 flex-1">
                Limpiar
              </button>
              <button (click)="applyFilters()" class="btn-primary cursor-pointer text-sm py-2 flex-1">
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
        <!-- Botones debajo (visibles en móviles, ocultos en desktop) -->
        <div class="flex justify-end space-x-2 mt-4 lg:hidden" *ngIf="selectedAccount">
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
        <div *ngIf="activeTab === 'list' && selectedAccount" class="mt-4">
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
            <table class="w-full divide-y divide-gray-200" style="min-width: 1200px;">
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
                  <th class="table-header">Banco</th>
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
                    <div class="max-w-2xl truncate" [title]="transaction.concepto">
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
                    <span *ngIf="transaction?.banco" 
                          class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {{ transaction.banco }}
                    </span>
                    <span *ngIf="!transaction?.banco" 
                          class="text-gray-400 text-xs">
                      -
                    </span>
                  </td>
                  <td class="table-cell">
                    <div class="flex items-center">
                      <button type="button"
                              *ngIf="editMode"
                              (click)="editCategory(transaction)" 
                              class="text-primary-600 hover:text-primary-900 text-lg cursor-pointer p-1 hover:bg-primary-50 rounded transition-colors"
                              title="Editar categoría">
                        ✏️
                      </button>
                      <span *ngIf="editMode" class="w-8"></span>
                      <button type="button"
                              *ngIf="transaction?.categoria && !transaction.isValidated"
                              (click)="validateCategory(transaction)"
                              class="flex items-center space-x-1 text-yellow-600 hover:text-yellow-800 text-sm font-medium cursor-pointer bg-yellow-50 px-2 py-1 rounded">
                        <span>⚠️</span>
                        <span>Validar</span>
                      </button>
                      <button type="button"
                              *ngIf="editMode"
                              (click)="confirmDeleteTransaction(transaction); $event.stopPropagation()" 
                              class="text-red-600 hover:text-red-800 text-lg cursor-pointer p-1 hover:bg-red-50 rounded transition-colors ml-auto"
                              title="Eliminar transacción">
                        🗑️
                      </button>
                      <span *ngIf="!editMode && (!transaction?.categoria || transaction.isValidated)" 
                            class="text-xs text-gray-400 italic">
                        Activa modo edición
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Vista de Ranking -->
        <div *ngIf="activeTab === 'ranking' && selectedAccount" class="mt-4 space-y-8">
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
         class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
         style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;">
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
            <button type="button"
                    (click)="suggestCategory()" 
                    class="btn-secondary flex items-center space-x-1 cursor-pointer">
              <span>🤖</span>
              <span>Sugerir con IA</span>
            </button>
            <div class="flex space-x-2">
              <button type="button"
                      (click)="cancelEdit()" 
                      class="btn-secondary cursor-pointer">
                Cancelar
              </button>
              <button type="button"
                      (click)="saveCategory()" 
                      class="btn-primary cursor-pointer">
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación de Eliminación -->
    <div *ngIf="showDeleteModal" 
         class="fixed inset-0 bg-gray-600 bg-opacity-50 z-[9999] flex items-center justify-center"
         (click)="cancelDelete()"
         style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
           (click)="$event.stopPropagation()"
           style="z-index: 10000; position: relative;">
        <div>
          <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 text-center mb-2">
            ¿Eliminar transacción?
          </h3>
          <div class="mt-2">
            <p class="text-sm text-gray-500 text-center mb-4">
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar esta transacción?
            </p>
            <div *ngIf="transactionToDelete" class="bg-gray-50 rounded-lg p-3 mb-4">
              <p class="text-sm font-medium text-gray-900">
                {{ transactionToDelete.concepto }}
              </p>
              <p class="text-xs text-gray-600 mt-1">
                {{ transactionToDelete.fecha | date:'dd/MM/yyyy' }} - 
                <span [class]="transactionToDelete.importe >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ transactionToDelete.importe | currency:'EUR':'symbol':'1.2-2':'es' }}
                </span>
              </p>
            </div>
            <div class="flex space-x-3 justify-center">
              <button type="button"
                      (click)="cancelDelete()" 
                      class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer">
                Cancelar
              </button>
              <button type="button"
                      (click)="deleteTransaction()" 
                      class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium cursor-pointer">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TransactionsComponent implements OnInit, OnDestroy {
  transactions: (Transaction & { isValidated?: boolean })[] = [];
  categories: any[] = [];
  selectedAccount: string | null = null; // Cuenta seleccionada desde servicio global
  filters: TransactionFilters = {};
  selectedMonth: Date;
  validatedConcepts: Set<string> = new Set();
  isFullYearSelected: boolean = false;
  editMode: boolean = false; // Modo edición para mostrar opciones de eliminación
  private subscriptions = new Subscription();

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

  // Modal de confirmación de eliminación
  showDeleteModal = false;
  transactionToDelete: Transaction | null = null;

  // Sugerencia de IA
  aiSuggestion: {
    category_id: number;
    confidence: number;
    keywords: string[];
    explanation: string;
  } | null = null;

  constructor(
    private transactionService: TransactionService,
    private accountService: AccountService
  ) {
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
    // Obtener cuenta seleccionada actual
    this.selectedAccount = this.accountService.getSelectedAccount();
    if (this.selectedAccount) {
      this.filters.banco = this.selectedAccount;
    }

    // Suscribirse a cambios en la cuenta seleccionada
    this.subscriptions.add(
      this.accountService.selectedAccount$.subscribe(account => {
        console.log('🔄 Cambio de cuenta detectado:', account);
        this.selectedAccount = account;
        if (account) {
          this.filters.banco = account;
          console.log('📝 Aplicando filtro de banco:', account);
          // Resetear página y recargar
          this.currentPage = 1;
          this.loadTransactions();
        } else {
          this.filters.banco = undefined;
          this.transactions = [];
        }
      })
    );

    // Inicializar con el mes actual (esto también cargará las transacciones)
    this.loadValidatedConcepts();
    this.onMonthChange(this.selectedMonth);
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
    
    // Desactivar el checkbox de año completo al cambiar el mes
    this.isFullYearSelected = false;
    
    // Formatear el primer día del mes (siempre 01)
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const startStr = `${date.getFullYear()}-${month}-01`;
    
    // Calcular el último día según el mes
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const endStr = `${date.getFullYear()}-${month}-${lastDay}`;
    
    // Actualizar los filtros, pero mantener el banco seleccionado
    this.filters = {
      ...this.filters,  // Mantener otros filtros (incluyendo banco)
      fechaDesde: startStr,
      fechaHasta: endStr
    };

    // Asegurarse de que el banco esté en los filtros si hay uno seleccionado
    if (this.selectedAccount && !this.filters.banco) {
      this.filters.banco = this.selectedAccount;
    }
    
    console.log('📅 Mes cambiado, filtros actualizados:', {
      mes: date.toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      desde: startStr,
      hasta: endStr,
      banco: this.filters.banco
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
    // Si no hay cuenta seleccionada, no cargar transacciones
    if (!this.selectedAccount) {
      console.log('⚠️ No hay cuenta seleccionada, no se cargan transacciones');
      this.transactions = [];
      return;
    }

    // Asegurarse de que el filtro de banco esté aplicado
    if (!this.filters.banco || this.filters.banco !== this.selectedAccount) {
      this.filters.banco = this.selectedAccount;
      console.log('📝 Asegurando filtro de banco:', this.selectedAccount);
    }

    console.log('🔄 Cargando transacciones...', {
      banco: this.filters.banco,
      fechaDesde: this.filters.fechaDesde,
      fechaHasta: this.filters.fechaHasta,
      otrosFiltros: this.filters
    });
    
    // Agregar parámetros de paginación y ordenación a los filtros
    const filtersWithPagination = {
      ...this.filters,
      page: this.currentPage.toString(),
      limit: this.pageSize.toString(),
      sortBy: this.sortColumn,
      sortDirection: this.sortDirection
    };
    
    console.log('📤 Enviando filtros completos:', filtersWithPagination);
    
    this.transactionService.getTransactions(filtersWithPagination).subscribe({
      next: (response) => {
        console.log('✅ Transacciones cargadas:', {
          total: response.pagination.total,
          count: response.transactions.length,
          banco: this.filters.banco
        });
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
    // Limpiar todos los filtros excepto las fechas del mes seleccionado
    const { fechaDesde, fechaHasta } = this.filters;
    this.filters = { fechaDesde, fechaHasta };
    
    this.currentPage = 1;
    this.loadTransactions();
  }

  selectFullYear(): void {
    const currentYear = new Date().getFullYear();
    // Establecer desde el 1 de enero hasta el 31 de diciembre del año actual
    this.filters.fechaDesde = `${currentYear}-01-01`;
    this.filters.fechaHasta = `${currentYear}-12-31`;
    
    // Aplicar filtros automáticamente
    this.currentPage = 1;
    this.loadTransactions();
  }

  toggleFullYear(): void {
    this.isFullYearSelected = !this.isFullYearSelected;
    if (this.isFullYearSelected) {
      this.selectFullYear();
    } else {
      // Restaurar las fechas del mes seleccionado
      this.onMonthChange(this.selectedMonth);
    }
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

  confirmDeleteTransaction(transaction: Transaction): void {
    console.log('🗑️ Confirmando eliminación de transacción:', transaction);
    console.log('🔍 Estado antes:', { showDeleteModal: this.showDeleteModal, transactionToDelete: this.transactionToDelete });
    
    this.transactionToDelete = transaction;
    this.showDeleteModal = true;
    
    console.log('✅ Estado después:', { showDeleteModal: this.showDeleteModal, transactionToDelete: this.transactionToDelete });
    
    // Forzar detección de cambios (útil en desarrollo)
    setTimeout(() => {
      console.log('⏱️ Estado después de timeout:', { showDeleteModal: this.showDeleteModal });
    }, 100);
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.transactionToDelete = null;
  }

  deleteTransaction(): void {
    if (!this.transactionToDelete || !this.transactionToDelete.id) {
      return;
    }

    const transactionId = this.transactionToDelete.id;
    console.log('🗑️ Eliminando transacción:', transactionId);

    this.transactionService.deleteTransaction(transactionId).subscribe({
      next: (response) => {
        console.log('✅ Transacción eliminada:', response.message);
        // Remover la transacción de la lista
        this.transactions = this.transactions.filter(t => t.id !== transactionId);
        this.updateTransactionsValidationStatus();
        // Actualizar contador de totales
        this.totalTransactions = Math.max(0, this.totalTransactions - 1);
        // Recalcular totalPages si es necesario
        this.totalPages = Math.ceil(this.totalTransactions / this.pageSize);
        // Si la página actual quedó vacía, ir a la anterior
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = this.totalPages;
        }
        // Cerrar modal
        this.showDeleteModal = false;
        this.transactionToDelete = null;
        
        // Si quedan transacciones en la página actual, recargar para asegurar consistencia
        if (this.transactions.length > 0) {
          this.loadTransactions();
        }
      },
      error: (error) => {
        console.error('❌ Error al eliminar transacción:', error);
        alert('Error al eliminar la transacción. Por favor, intenta de nuevo.');
      }
    });
  }

  saveCategory(): void {
    if (!this.editingTransaction.id) {
      console.error('No hay transacción seleccionada para editar');
      return;
    }

    console.log('Actualizando categoría de transacción:', this.editingTransaction.id);
    console.log('Nueva categoría:', this.editingTransaction.categoria);

    this.transactionService.updateTransactionCategory(
      this.editingTransaction.id,
      this.editingTransaction.categoria || ''
    ).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
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
        console.error('Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
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