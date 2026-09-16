import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-approval-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[9998] overflow-y-auto" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="onCancel()"></div>

        <!-- Center modal -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div class="inline-block align-bottom bg-white dark:bg-slate-900 rounded-2xl text-left overflow-hidden shadow-card-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-100 dark:border-slate-800"
             (click)="$event.stopPropagation()">
          <div class="px-6 pt-6 pb-4">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {{ title }}
            </h3>

            <!-- Summary Section (Optional) -->
            <div *ngIf="showSummary" class="request-summary mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 class="font-semibold text-slate-900 dark:text-white">{{ summaryTitle }}</h4>
              <div class="text-sm text-slate-600 dark:text-slate-400 mt-1" [innerHTML]="summaryContent"></div>
            </div>

            <!-- Comments Textarea -->
            <div class="form-group mb-4">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ commentsLabel }}
              </label>
              <textarea
                [(ngModel)]="comments"
                [placeholder]="commentsPlaceholder"
                rows="4"
                class="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              ></textarea>
            </div>
          </div>

          <div class="bg-slate-50 dark:bg-slate-950 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
            <app-button
              [variant]="confirmVariant"
              (clicked)="onConfirm()"
              [disabled]="loading || (requireComments && !comments.trim())"
            >
              <i *ngIf="loading" class="fas fa-spinner fa-spin mr-1"></i>
              <i *ngIf="!loading && confirmIcon" [class]="confirmIcon + ' mr-1'"></i>
              {{ confirmText }}
            </app-button>
            <app-button variant="secondary" (clicked)="onCancel()" [disabled]="loading">
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
export class ApprovalModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  
  // Summary section
  @Input() showSummary = false;
  @Input() summaryTitle = '';
  @Input() summaryContent = '';
  
  // Comments
  @Input() comments = '';
  @Input() commentsLabel = 'Comments (Optional)';
  @Input() commentsPlaceholder = 'Add any comments...';
  @Input() requireComments = false;
  
  // Buttons
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() confirmVariant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' = 'primary';
  @Input() confirmIcon = '';
  @Input() loading = false;
  
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() commentsChange = new EventEmitter<string>();

  onConfirm() {
    if (!this.requireComments || this.comments.trim()) {
      this.confirm.emit(this.comments);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
