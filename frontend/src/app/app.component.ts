import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from './services/account.service';
import { TransactionService } from './services/transaction.service';
import { Subscription } from 'rxjs';
import { BankSummary } from './models/transaction.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div class="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center space-x-6">
              <h1 class="text-2xl font-bold text-gray-900">💰 Mi Finanzas App</h1>
              
              <!-- Selector de Cuenta -->
              <div class="flex items-center space-x-3">
                <div class="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                  </svg>
                  <select [(ngModel)]="selectedAccount" 
                          (ngModelChange)="onAccountChange($event)"
                          class="bg-transparent border-0 text-sm font-medium text-gray-900 focus:outline-none focus:ring-0 cursor-pointer min-w-[180px]">
                    <option *ngFor="let account of accounts" [ngValue]="account.nombre">
                      {{ account.nombre }}
                    </option>
                  </select>
                </div>
                
                <!-- Balance de cuenta seleccionada -->
                <div *ngIf="selectedAccountData" 
                     class="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg border" 
                     [class.border-green-300]="selectedAccountData.balance >= 0"
                     [class.border-red-300]="selectedAccountData.balance < 0">
                  <span class="text-xs text-gray-600 font-medium">Balance:</span>
                  <span class="text-sm font-bold"
                        [class.text-green-600]="selectedAccountData.balance >= 0"
                        [class.text-red-600]="selectedAccountData.balance < 0">
                    {{ selectedAccountData.balance | currency:'EUR':'symbol':'1.2-2':'es' }}
                  </span>
                </div>
              </div>
            </div>

            <nav class="flex space-x-4">
              <a routerLink="/dashboard" 
                 routerLinkActive="text-primary-600 bg-primary-50"
                 class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                Dashboard
              </a>
              <a routerLink="/accounts" 
                 routerLinkActive="text-primary-600 bg-primary-50"
                 class="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                Cuentas
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
      <main class="max-w-[98%] xl:max-w-[80%] mx-auto py-6 sm:px-6 lg:px-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'financial-app-frontend';
  accounts: BankSummary[] = [];
  selectedAccount: string | null = null;
  selectedAccountData: BankSummary | null = null;
  private subscriptions = new Subscription();

  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    // Cargar cuentas
    this.transactionService.getBanks().subscribe({
      next: (response) => {
        this.accounts = response.banks || [];
        this.accountService.setAccounts(this.accounts);
      },
      error: (error) => {
        console.error('Error cargando cuentas:', error);
      }
    });

    // Suscribirse a cambios de cuenta seleccionada
    this.subscriptions.add(
      this.accountService.selectedAccount$.subscribe(account => {
        this.selectedAccount = account;
        this.updateSelectedAccountData();
      })
    );

    // Suscribirse a cambios en la lista de cuentas
    this.subscriptions.add(
      this.accountService.accounts$.subscribe(accounts => {
        this.accounts = accounts;
        this.updateSelectedAccountData();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onAccountChange(accountName: string): void {
    console.log('🔄 AppComponent: Cambio de cuenta en selector:', accountName);
    this.accountService.setSelectedAccount(accountName);
    console.log('✅ AppComponent: Cuenta cambiada en servicio');
  }

  private updateSelectedAccountData(): void {
    this.selectedAccountData = this.accountService.getSelectedAccountData();
  }
}
