import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-month-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center">
      <div class="flex items-center justify-between" style="width: 280px;">
        <button (click)="previousMonth()" 
                class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="text-lg font-medium text-gray-900 w-48 text-center">
          {{ getCurrentMonthName() }} {{ currentDate.getFullYear() }}
        </div>

        <button (click)="nextMonth()"
                [disabled]="isCurrentMonth()"
                [class.opacity-50]="isCurrentMonth()"
                [class.cursor-not-allowed]="isCurrentMonth()"
                class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class MonthSelectorComponent implements OnInit {
  @Input() currentDate: Date = new Date(new Date().setMonth(new Date().getMonth() - 1));
  @Output() monthChange = new EventEmitter<Date>();

  private monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  private readonly STORAGE_KEY = 'selectedMonth';

  ngOnInit() {
    // Recuperar el mes guardado al iniciar
    const savedMonth = localStorage.getItem(this.STORAGE_KEY);
    if (savedMonth) {
      this.currentDate = new Date(savedMonth);
      this.monthChange.emit(this.currentDate);
    }
  }

  private saveMonth(date: Date) {
    localStorage.setItem(this.STORAGE_KEY, date.toISOString());
  }

  getCurrentMonthName(): string {
    return this.monthNames[this.currentDate.getMonth()];
  }

  previousMonth(): void {
    const newDate = new Date(this.currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    this.currentDate = newDate;
    this.saveMonth(newDate);
    this.monthChange.emit(newDate);
  }

  nextMonth(): void {
    if (this.isCurrentMonth()) return;
    
    const newDate = new Date(this.currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    this.currentDate = newDate;
    this.saveMonth(newDate);
    this.monthChange.emit(newDate);
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.currentDate.getMonth() === now.getMonth() &&
           this.currentDate.getFullYear() === now.getFullYear();
  }
}
