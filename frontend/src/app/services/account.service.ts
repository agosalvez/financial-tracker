import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BankSummary } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private selectedAccountSubject = new BehaviorSubject<string | null>(null);
  public selectedAccount$: Observable<string | null> = this.selectedAccountSubject.asObservable();

  private accountsSubject = new BehaviorSubject<BankSummary[]>([]);
  public accounts$: Observable<BankSummary[]> = this.accountsSubject.asObservable();

  constructor() {
    // Restaurar cuenta seleccionada del localStorage
    const savedAccount = localStorage.getItem('selectedAccount');
    if (savedAccount) {
      this.selectedAccountSubject.next(savedAccount);
    }
  }

  setSelectedAccount(accountName: string | null): void {
    console.log('🏦 AccountService: Cambiando cuenta a:', accountName);
    if (accountName) {
      localStorage.setItem('selectedAccount', accountName);
    } else {
      localStorage.removeItem('selectedAccount');
    }
    this.selectedAccountSubject.next(accountName);
    console.log('✅ AccountService: Cuenta actualizada, emitiendo cambio');
  }

  getSelectedAccount(): string | null {
    return this.selectedAccountSubject.value;
  }

  setAccounts(accounts: BankSummary[]): void {
    this.accountsSubject.next(accounts);
    
    // Verificar si la cuenta seleccionada todavía existe
    const currentAccount = this.getSelectedAccount();
    if (currentAccount && !accounts.find(a => a.nombre === currentAccount)) {
      // La cuenta seleccionada ya no existe, limpiar selección
      this.setSelectedAccount(null);
    }
    
    // Si no hay cuenta seleccionada pero hay cuentas disponibles, seleccionar la primera
    if (!this.getSelectedAccount() && accounts.length > 0) {
      this.setSelectedAccount(accounts[0].nombre);
    }
  }

  getAccounts(): BankSummary[] {
    return this.accountsSubject.value;
  }

  getSelectedAccountData(): BankSummary | null {
    const selected = this.getSelectedAccount();
    if (!selected) return null;
    
    return this.getAccounts().find(account => account.nombre === selected) || null;
  }
}
