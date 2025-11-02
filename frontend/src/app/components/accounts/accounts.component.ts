import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { TransactionService } from '../../services/transaction.service';
import { BankSummary } from '../../models/transaction.model';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-6 p-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Mis Cuentas</h1>
          <p class="text-gray-600 mt-1">Resumen y estadísticas de todas tus cuentas bancarias</p>
        </div>
      </div>

      <!-- Grid de Cuentas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let account of accounts" 
             (click)="selectAccount(account.nombre)"
             class="card cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
             [class.ring-2]="isSelected(account.nombre)"
             [class.ring-blue-500]="isSelected(account.nombre)">
          <!-- Header de la tarjeta -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {{ account.nombre.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">{{ account.nombre }}</h3>
                <p class="text-xs text-gray-500">
                  {{ account.totalTransacciones }} transacciones
                </p>
              </div>
            </div>
            <span *ngIf="isSelected(account.nombre)" 
                  class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              Activa
            </span>
          </div>

          <!-- Balance -->
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-1">Balance</p>
            <p class="text-2xl font-bold"
               [class.text-green-600]="account.balance >= 0"
               [class.text-red-600]="account.balance < 0">
              {{ account.balance | currency:'EUR':'symbol':'1.2-2':'es' }}
            </p>
          </div>

          <!-- Estadísticas -->
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p class="text-xs text-gray-600 mb-1">Ingresos</p>
              <p class="text-sm font-semibold text-green-600">
                {{ account.totalIngresos | currency:'EUR':'symbol':'1.2-2':'es' }}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-600 mb-1">Gastos</p>
              <p class="text-sm font-semibold text-red-600">
                {{ account.totalGastos | currency:'EUR':'symbol':'1.2-2':'es' }}
              </p>
            </div>
          </div>

          <!-- Fechas -->
          <div class="mt-4 pt-4 border-t border-gray-200">
            <div class="flex justify-between text-xs text-gray-500">
              <span>Primera: {{ account.primeraTransaccion | date:'dd/MM/yyyy' }}</span>
              <span>Última: {{ account.ultimaTransaccion | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Mensaje si no hay cuentas -->
      <div *ngIf="accounts.length === 0" class="card text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No hay cuentas</h3>
        <p class="mt-1 text-sm text-gray-500">Sube archivos de estados de cuenta para crear tus cuentas.</p>
        <div class="mt-6">
          <a routerLink="/upload" class="btn-primary inline-flex items-center cursor-pointer">
            Subir Archivo
          </a>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AccountsComponent implements OnInit {
  accounts: BankSummary[] = [];
  selectedAccount: string | null = null;

  constructor(
    private accountService: AccountService,
    private transactionService: TransactionService
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
    
    // Suscribirse a cambios en la cuenta seleccionada
    this.accountService.selectedAccount$.subscribe(account => {
      this.selectedAccount = account;
    });
  }

  loadAccounts(): void {
    this.transactionService.getBanks().subscribe({
      next: (response) => {
        this.accounts = response.banks || [];
        this.accountService.setAccounts(this.accounts);
      },
      error: (error) => {
        console.error('Error cargando cuentas:', error);
      }
    });
  }

  selectAccount(accountName: string): void {
    this.accountService.setSelectedAccount(accountName);
    // Opcional: redirigir a transacciones
    // this.router.navigate(['/transactions']);
  }

  isSelected(accountName: string): boolean {
    return this.selectedAccount === accountName;
  }
}
