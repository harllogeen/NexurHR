import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[9998] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="onCancel()"></div>

        <!-- Center modal -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div class="inline-block align-bottom bg-white dark:bg-slate-900 rounded-2xl text-left overflow-hidden shadow-card-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-100 dark:border-slate-800"
             (click)="$event.stopPropagation()">
          <div class="px-6 pt-6 pb-4 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <!-- Icon -->
              <div [ngClass]="{
                'bg-red-100 dark:bg-red-900/30': type === 'danger',
                'bg-yellow-100 dark:bg-yellow-900/30': type === 'warning',
                'bg-blue-100 dark:bg-blue-900/30': type === 'info'
              }" class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl sm:mx-0 sm:h-10 sm:w-10">
                <!-- Danger Icon -->
                <svg *ngIf="type === 'danger'" class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <!-- Warning Icon -->
                <svg *ngIf="type === 'warning'" class="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <!-- Info Icon -->
                <svg *ngIf="type === 'info'" class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <!-- Content -->
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 class="text-lg leading-6 font-bold text-slate-900 dark:text-white" id="modal-title">
                  {{ title }}
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-slate-600 dark:text-slate-400">
                    {{ message }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="bg-slate-50 dark:bg-slate-950 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
            <app-button
              [variant]="confirmButtonVariant"
              (clicked)="onConfirm()"
              [customClass]="'flex-1 sm:flex-initial justify-center'"
            >
              {{ confirmText }}
            </app-button>
            
            <app-button
              variant="secondary"
              (clicked)="onCancel()"
              [customClass]="'flex-1 sm:flex-initial justify-center'"
            >
              {{ cancelText }}
            </app-button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class ConfirmationModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() type: 'danger' | 'warning' | 'info' = 'warning';
  @Input() confirmButtonVariant: 'primary' | 'danger' = 'primary';
  
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}
