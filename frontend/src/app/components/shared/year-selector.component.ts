import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-year-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center space-x-4">
      <select 
        [(ngModel)]="selectedYear"
        (ngModelChange)="onYearChange($event)"
        class="input-field min-w-[120px] text-center font-medium"
      >
        <option *ngFor="let year of availableYears" [value]="year">
          {{ year }}
        </option>
      </select>

      <div class="flex items-center space-x-2">
        <button 
          (click)="previousYear()"
          class="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          [disabled]="selectedYear === minYear"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button 
          (click)="nextYear()"
          class="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          [disabled]="selectedYear === maxYear"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .input-field:disabled {
      @apply opacity-50 cursor-not-allowed;
    }
    button:disabled {
      @apply opacity-50 cursor-not-allowed;
    }
  `]
})
export class YearSelectorComponent implements OnInit {
  @Input() currentYear: number = new Date().getFullYear();
  @Output() yearChange = new EventEmitter<number>();

  selectedYear: number;
  availableYears: number[] = [];
  minYear: number = 2020;  // Año mínimo por defecto
  maxYear: number = new Date().getFullYear();

  private readonly STORAGE_KEY = 'selectedYear';

  constructor() {
    this.selectedYear = this.currentYear;
    this.generateYearRange();
  }

  ngOnInit() {
    const savedYear = localStorage.getItem(this.STORAGE_KEY);
    if (savedYear) {
      this.selectedYear = parseInt(savedYear);
      this.yearChange.emit(this.selectedYear);
    }
  }

  private generateYearRange() {
    this.availableYears = [];
    for (let year = this.minYear; year <= this.maxYear; year++) {
      this.availableYears.push(year);
    }
    this.availableYears.reverse(); // Mostrar años más recientes primero
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.saveYear();
    this.yearChange.emit(year);
  }

  previousYear() {
    if (this.selectedYear > this.minYear) {
      this.selectedYear--;
      this.saveYear();
      this.yearChange.emit(this.selectedYear);
    }
  }

  nextYear() {
    if (this.selectedYear < this.maxYear) {
      this.selectedYear++;
      this.saveYear();
      this.yearChange.emit(this.selectedYear);
    }
  }

  private saveYear() {
    localStorage.setItem(this.STORAGE_KEY, this.selectedYear.toString());
  }
}
