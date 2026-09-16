import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      (click)="handleClick($event)"
      [ngClass]="{
        'btn': true,
        'btn-primary': variant === 'primary',
        'btn-secondary': variant === 'secondary',
        'btn-ghost': variant === 'ghost',
        'btn-danger': variant === 'danger',
        'btn-success': variant === 'success',
        'btn-sm': size === 'sm',
        'btn-lg': size === 'lg',
        'btn-icon': iconOnly
      }"
      [class]="customClass"
    >
      <!-- Loading Spinner -->
      <svg
        *ngIf="loading"
        class="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>

      <!-- Icon Only Mode -->
      <svg
        *ngIf="iconOnly && icon && !loading"
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path [attr.d]="getIconPath()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
      </svg>

      <!-- Button with Text and Optional Icon -->
      <ng-container *ngIf="!iconOnly">
        <!-- Icon (Left) -->
        <svg
          *ngIf="icon && iconPosition === 'left' && !loading"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path [attr.d]="getIconPath()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>

        <!-- Button Text -->
        <span>
          <ng-content></ng-content>
        </span>

        <!-- Icon (Right) -->
        <svg
          *ngIf="icon && iconPosition === 'right' && !loading"
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path [attr.d]="getIconPath()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
      </ng-container>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    
    .btn-lg {
      @apply px-6 py-3 text-base;
    }
  `]
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() icon = '';
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() iconOnly = false;
  @Input() customClass = '';
  @Output() clicked = new EventEmitter<Event>();

  handleClick(event: Event) {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }

  getIconPath(): string {
    const icons: any = {
      plus: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
      edit: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
      delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      save: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4',
      download: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
      close: 'M6 18L18 6M6 6l12 12',
      check: 'M5 13l4 4L19 7',
      'arrow-right': 'M9 5l7 7-7 7',
      'arrow-left': 'M15 19l-7-7 7-7',
      refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      export: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4'
    };
    return icons[this.icon] || '';
  }
}
