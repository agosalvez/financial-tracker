import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900">Subir Archivo</h1>
      </div>

      <!-- Instrucciones -->
      <div class="card">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Instrucciones de Importación</h3>
        <div class="prose max-w-none">
          <p class="text-gray-600 mb-4">
            Sube tu archivo CSV bancario para importar los movimientos. Selecciona tu banco y el sistema usará el parser específico para procesar el archivo correctamente.
          </p>
          <div class="bg-green-50 p-4 rounded-lg mt-4">
            <h4 class="font-medium text-green-900 mb-2">📁 Archivo de ejemplo:</h4>
            <p class="text-green-800 text-sm mb-2">
              Puedes descargar un archivo de ejemplo para ver el formato correcto:
            </p>
            <a href="/uploads/ejemplo_movimientos_simple.csv" 
               download="ejemplo_movimientos.csv"
               class="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Descargar ejemplo CSV
            </a>
          </div>
        </div>
      </div>

      <!-- Zona de subida -->
      <div class="card">
        <div class="text-center">
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-12" 
               [class.border-primary-500]="isDragOver"
               [class.bg-primary-50]="isDragOver"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)"
               (drop)="onDrop($event)">
            
            <div *ngIf="!selectedFile" class="space-y-4">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="space-y-1">
                <p class="text-sm text-gray-600">
                  <button type="button" 
                          (click)="fileInput.click()"
                          class="font-medium text-primary-600 hover:text-primary-500 cursor-pointer">
                    Haz clic para subir
                  </button>
                  o arrastra y suelta tu archivo aquí
                </p>
                <p class="text-xs text-gray-500">CSV (.csv) o Excel (.xlsx, .xls) hasta 10MB</p>
              </div>
            </div>

            <div *ngIf="selectedFile" class="space-y-4">
              <div class="flex items-center justify-center">
                <svg class="h-12 w-12 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
                <p class="text-xs text-gray-500">{{ selectedFile.size | number }} bytes</p>
              </div>
              <button (click)="removeFile()" 
                      class="text-sm text-danger-600 hover:text-danger-500 cursor-pointer">
                Eliminar archivo
              </button>
            </div>
          </div>

          <input #fileInput 
                 type="file" 
                 accept=".csv,.xlsx,.xls"
                 (change)="onFileSelected($event)"
                 class="hidden">
        </div>

        <!-- Indicador de detección automática -->
        <div *ngIf="isDetectingBank" class="card bg-blue-50 border-blue-200">
          <div class="flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <h3 class="text-lg font-medium text-blue-900">🔍 Detectando banco automáticamente...</h3>
              <p class="text-blue-800 text-sm">Analizando tu archivo para identificar el banco</p>
            </div>
          </div>
        </div>

        <!-- Mensaje de detección exitosa -->
        <div *ngIf="selectedBank && !showBankSelector && !isDetectingBank && selectedFile" class="card bg-green-50 border-green-200">
          <div class="flex items-center">
            <svg class="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 class="text-sm font-medium text-green-900">✅ Banco detectado automáticamente</h3>
              <p class="text-green-800 text-xs mt-1">Puedes subir el archivo directamente o cambiar el banco si es necesario</p>
            </div>
          </div>
        </div>

        <!-- Selector de banco -->
        <div *ngIf="showBankSelector" class="card bg-blue-50 border-blue-200">
          <h3 class="text-lg font-medium text-blue-900 mb-4">Selecciona tu banco</h3>
          <p class="text-blue-800 text-sm mb-4">
            Por favor, selecciona de qué banco proviene tu archivo para procesarlo correctamente:
          </p>
          <div *ngIf="supportedBanks.length === 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-yellow-800 text-sm">Cargando bancos disponibles...</p>
          </div>
          <div *ngIf="supportedBanks.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button *ngFor="let bank of supportedBanks" 
                    (click)="selectBank(bank.id)"
                    [class]="selectedBank === bank.id 
                      ? 'p-3 text-left border-2 border-green-500 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer transition-colors'
                      : 'p-3 text-left border border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 cursor-pointer transition-colors'">
              <div class="flex items-center justify-between">
                <div class="font-medium" [class.text-green-900]="selectedBank === bank.id" [class.text-blue-900]="selectedBank !== bank.id">
                  {{ bank.name }}
                </div>
                <span *ngIf="selectedBank === bank.id" class="text-green-600 text-sm">✓ Seleccionado</span>
              </div>
              <div class="text-sm mt-1" [class.text-green-700]="selectedBank === bank.id" [class.text-blue-700]="selectedBank !== bank.id">
                {{ bank.description }}
              </div>
              <div class="text-xs mt-1" [class.text-green-600]="selectedBank === bank.id" [class.text-blue-600]="selectedBank !== bank.id">
                Formatos: {{ bank.supportedFormats?.join(', ') || 'CSV, Excel' }}
              </div>
            </button>
          </div>
          <div class="flex justify-end space-x-3 mt-4">
            <button (click)="cancelBankSelection()" 
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex justify-center space-x-4 mt-6">
          <button (click)="fileInput.click()" 
                  [disabled]="isUploading"
                  class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            Seleccionar Archivo
          </button>
          <button (click)="uploadFile()" 
                  [disabled]="!selectedFile || isUploading"
                  class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <span *ngIf="!isUploading">Subir Archivo</span>
            <span *ngIf="isUploading" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Subiendo...
            </span>
          </button>
        </div>
      </div>

      <!-- Resultado de la subida -->
      <div *ngIf="uploadResult" class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-gray-900">¡Archivo subido correctamente!</h3>
            <p class="text-sm text-gray-600 mt-1">
              Se han importado {{ uploadResult.count }} movimientos exitosamente.
            </p>
          </div>
        </div>
        <div class="mt-4">
          <button (click)="goToTransactions()" class="btn-primary cursor-pointer">
            Ver Movimientos
          </button>
        </div>
      </div>

      <!-- Error de subida -->
      <div *ngIf="uploadError" class="card border-danger-200 bg-danger-50">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-danger-800">Error al subir archivo</h3>
            <p class="text-sm text-danger-700 mt-1">{{ uploadError || '' }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class UploadComponent {
  selectedFile: File | null = null;
  isDragOver = false;
  isUploading = false;
  uploadResult: { message: string; count: number } | null = null;
  uploadError: string | null = null;
  selectedBank: string = '';
  supportedBanks: any[] = [];
  showBankSelector = false;
  isDetectingBank = false;

  constructor(private transactionService: TransactionService) { 
    this.loadSupportedBanks();
  }

  ngOnInit(): void {
    this.loadSupportedBanks();
  }

  loadSupportedBanks(): void {
    console.log('🔄 Cargando bancos soportados...');
    this.transactionService.getSupportedBanks().subscribe({
      next: (response) => {
        console.log('📥 Respuesta completa del servidor:', response);
        this.supportedBanks = response.banks || [];
        console.log('✅ Bancos soportados cargados:', this.supportedBanks);
        console.log('📊 Total de bancos:', this.supportedBanks.length);
        this.supportedBanks.forEach((bank, index) => {
          console.log(`  ${index + 1}. ${bank.name} (${bank.id})`);
        });
        
        if (this.supportedBanks.length === 0) {
          console.warn('⚠️ No se encontraron bancos soportados');
          this.uploadError = 'No hay bancos disponibles. Por favor, verifica que el servidor esté ejecutándose correctamente.';
        } else if (this.supportedBanks.length === 1) {
          console.warn('⚠️ Solo se encontró 1 banco, deberían ser 2');
        }
      },
      error: (error) => {
        console.error('❌ Error cargando bancos soportados:', error);
        console.error('❌ Detalles del error:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.uploadError = `Error cargando lista de bancos: ${error.message || 'Error desconocido'}`;
        this.supportedBanks = [];
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      if (files.length > 1) {
        this.uploadError = 'Solo se permite subir un archivo a la vez';
        return;
      }
      this.selectFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectFile(target.files[0]);
    }
  }

  selectFile(file: File): void {
    console.log('Archivo seleccionado:', file.name, 'Tipo:', file.type);
    
    // Validar tipo de archivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidType = allowedTypes.includes(file.type) || 
                       (fileExtension && ['xlsx', 'xls', 'csv'].includes(fileExtension));
    
    if (!isValidType) {
      this.uploadError = 'Por favor, selecciona un archivo válido (.xlsx, .xls o .csv)';
      return;
    }

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = 'El archivo es demasiado grande. Máximo 10MB.';
      return;
    }

    this.selectedFile = file;
    this.uploadError = null;
    this.uploadResult = null;
    this.selectedBank = ''; // Reset bank selection when new file is selected
    
    console.log('Archivo validado correctamente:', file.name);
    
    // Intentar detectar el banco automáticamente
    this.detectBankAutomatically(file);
  }

  detectBankAutomatically(file: File): void {
    console.log('🔍 Detectando banco automáticamente...');
    this.isDetectingBank = true;
    
    this.transactionService.detectBank(file).subscribe({
      next: (result) => {
        this.isDetectingBank = false;
        console.log('📊 Resultado de detección:', result);
        
        if (result.detected && result.bankId && result.confidence && result.confidence >= 0.5) {
          console.log(`✅ Banco detectado: ${result.bankName} (${(result.confidence * 100).toFixed(1)}% confianza)`);
          this.selectedBank = result.bankId;
          
          // Si la confianza es alta (>= 0.8), mostrar mensaje pero continuar automáticamente
          if (result.confidence >= 0.8) {
            console.log('✅ Alta confianza - banco seleccionado automáticamente');
            // El banco ya está seleccionado, el usuario puede subir directamente
          } else {
            // Confianza media - mostrar selector pero preseleccionado
            console.log('⚠️ Confianza media - mostrar selector con banco preseleccionado');
            this.showBankSelector = true;
          }
        } else {
          console.log('❌ No se pudo detectar el banco automáticamente');
          // Mostrar selector para que el usuario elija manualmente
          this.showBankSelector = true;
        }
      },
      error: (error) => {
        this.isDetectingBank = false;
        console.error('❌ Error detectando banco:', error);
        // Si falla la detección, mostrar selector manual
        this.showBankSelector = true;
      }
    });
  }

  removeFile(): void {
    this.selectedFile = null;
    this.uploadError = null;
    this.uploadResult = null;
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    // Si no hay banco seleccionado, mostrar selector
    if (!this.selectedBank) {
      // Verificar que tenemos bancos cargados
      if (this.supportedBanks.length === 0) {
        this.uploadError = 'No hay bancos disponibles. Por favor, recarga la página.';
        console.error('No hay bancos soportados disponibles');
        return;
      }
      this.showBankSelector = true;
      return;
    }

    // Si ya tiene banco seleccionado, proceder directamente
    this.continueUpload();
  }

  selectBank(bankId: string): void {
    this.selectedBank = bankId;
    this.showBankSelector = false;
    this.continueUpload(); // Continuar con la subida
  }

  continueUpload(): void {
    if (!this.selectedFile) {
      console.error('No hay archivo seleccionado para subir');
      return;
    }

    if (!this.selectedBank) {
      this.uploadError = 'Por favor, selecciona un banco antes de continuar';
      console.error('No se ha seleccionado un banco');
      return;
    }

    console.log('Iniciando subida de archivo:', this.selectedFile.name);
    console.log('Banco seleccionado:', this.selectedBank);

    this.isUploading = true;
    this.uploadError = null;
    this.uploadResult = null;

    this.transactionService.uploadFile(this.selectedFile, this.selectedBank).subscribe({
      next: (result) => {
        this.uploadResult = result;
        this.isUploading = false;
        this.showBankSelector = false;
        this.selectedBank = '';
        this.selectedFile = null;
      },
      error: (error) => {
        console.error('Error al subir archivo:', error);
        this.uploadError = error.error?.message || error.error?.error || 'Error al subir el archivo';
        this.isUploading = false;
        this.showBankSelector = false;
      }
    });
  }

  cancelBankSelection(): void {
    this.showBankSelector = false;
    this.selectedBank = '';
    this.isUploading = false;
  }

  goToTransactions(): void {
    // Navegar a la página de transacciones
    window.location.href = '/transactions';
  }
}
