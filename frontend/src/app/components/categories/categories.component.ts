import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction.service';
import { Category } from '../../models/transaction.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900">Categorías</h1>
        <button (click)="showCreateModal = true" class="btn-primary cursor-pointer">
          Nueva Categoría
        </button>
      </div>

      <!-- Lista de categorías -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let category of categories" 
             class="card hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-4 h-4 rounded-full mr-3" 
                   [style.background-color]="category?.color"></div>
              <div>
                <h3 class="text-lg font-medium text-gray-900">{{ category?.nombre }}</h3>
                <div class="flex space-x-4">
                  <p class="text-sm text-gray-500 capitalize">{{ category?.tipo }}</p>
                  <div class="flex items-center space-x-1 text-sm text-gray-500">
                    <span class="font-medium">{{ category.media_mensual }}</span>
                    <span>mov/mes</span>
                    <span class="text-gray-400">({{ category.total_movimientos }} total)</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex space-x-2">
              <button (click)="editCategory(category)" 
                      class="text-primary-600 hover:text-primary-900 text-sm cursor-pointer">
                Editar
              </button>
              <button (click)="deleteCategory(category.id)" 
                      class="text-danger-600 hover:text-danger-900 text-sm cursor-pointer">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Mensaje si no hay categorías -->
      <div *ngIf="categories?.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No hay categorías</h3>
        <p class="mt-1 text-sm text-gray-500">Comienza creando tu primera categoría.</p>
      </div>
    </div>

    <!-- Modal para crear/editar categoría -->
    <div *ngIf="showCreateModal || showEditModal" 
         class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ showCreateModal ? 'Nueva Categoría' : 'Editar Categoría' }}
          </h3>
          
          <form (ngSubmit)="saveCategory()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" 
                     [(ngModel)]="editingCategory.nombre"
                     name="nombre"
                     required
                     class="input-field"
                     placeholder="Ej: Alimentación, Transporte...">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select [(ngModel)]="editingCategory.tipo" 
                      name="tipo"
                      required
                      class="input-field">
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div class="flex space-x-2">
                <div *ngFor="let color of availableColors" 
                     (click)="editingCategory.color = color"
                     class="w-8 h-8 rounded-full cursor-pointer border-2"
                     [class.border-gray-900]="editingCategory.color === color"
                     [class.border-gray-300]="editingCategory.color !== color"
                     [style.background-color]="color">
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Icono (opcional)</label>
              <input type="text" 
                     [(ngModel)]="editingCategory.icono"
                     name="icono"
                     class="input-field"
                     placeholder="Ej: 🍕, 🚗, 🏠...">
            </div>

            <div class="flex justify-end space-x-2 pt-4">
              <button type="button" 
                      (click)="cancelEdit()" 
                      class="btn-secondary cursor-pointer">
                Cancelar
              </button>
              <button type="submit" 
                      [disabled]="!editingCategory.nombre || !editingCategory.tipo"
                      class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {{ showCreateModal ? 'Crear' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  showCreateModal = false;
  showEditModal = false;
  editingCategory: Category = {
    id: 0,
    nombre: '',
    tipo: 'gasto',
    color: '#3b82f6',
    icono: '',
    total_movimientos: 0,
    total_meses: 0,
    media_mensual: 0
  };

  availableColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#f43f5e', '#8b5a2b', '#64748b', '#0ea5e9', '#a855f7'
  ];

  constructor(private transactionService: TransactionService) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.transactionService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  editCategory(category: Category): void {
    this.editingCategory = { ...category };
    this.showEditModal = true;
    this.showCreateModal = false;
  }

  deleteCategory(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
      this.transactionService.deleteCategory(id).subscribe({
        next: () => {
          this.loadCategories();
        },
        error: (error) => {
          console.error('Error al eliminar categoría:', error);
          alert('Error al eliminar la categoría');
        }
      });
    }
  }

  saveCategory(): void {
    if (!this.editingCategory.nombre || !this.editingCategory.tipo) return;

    const categoryData = {
      nombre: this.editingCategory.nombre,
      tipo: this.editingCategory.tipo,
      color: this.editingCategory.color || '#3b82f6',
      icono: this.editingCategory.icono || '',
      total_movimientos: 0,
      total_meses: 0,
      media_mensual: 0
    };

    if (this.showCreateModal) {
      this.transactionService.createCategory(categoryData).subscribe({
        next: () => {
          this.cancelEdit();
          this.loadCategories();
        },
        error: (error) => {
          console.error('Error al crear categoría:', error);
          alert('Error al crear la categoría');
        }
      });
    } else {
      this.transactionService.updateCategory(this.editingCategory.id!, categoryData).subscribe({
        next: () => {
          this.cancelEdit();
          this.loadCategories();
        },
        error: (error) => {
          console.error('Error al actualizar categoría:', error);
          alert('Error al actualizar la categoría');
        }
      });
    }
  }

  cancelEdit(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.editingCategory = {
      id: 0,
      nombre: '',
      tipo: 'gasto',
      color: '#3b82f6',
      icono: '',
      total_movimientos: 0,
      total_meses: 0,
      media_mensual: 0
    };
  }
}
