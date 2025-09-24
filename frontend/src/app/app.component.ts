import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-900">💰 Mi Finanzas App</h1>
            </div>
            <nav class="flex space-x-8">
              <a routerLink="/" 
                 routerLinkActive="text-primary-600 bg-primary-50"
                 class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                Dashboard
              </a>
              <a routerLink="/transactions" 
                 routerLinkActive="text-primary-600 bg-primary-50"
                 class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                Movimientos
              </a>
              <a routerLink="/annual" 
                 routerLinkActive="text-primary-600 bg-primary-50"
                 class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                Resumen Anual
              </a>
              <a routerLink="/upload" 
                 routerLinkActive="text-primary-600 bg-primary-50"
                 class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                Subir Datos
              </a>
              <a routerLink="/categories" 
                 routerLinkActive="text-primary-600 bg-primary-50"
                 class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                Categorías
              </a>
            </nav>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: []
})
export class AppComponent {
  title = 'financial-app-frontend';
}
