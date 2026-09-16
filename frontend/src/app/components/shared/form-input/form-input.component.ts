import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormInputComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-group">
      <label *ngIf="label" [for]="id" class="label">
        <svg *ngIf="icon" class="label-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path [attr.d]="getIconPath()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
        </svg>
        <span>{{ label }}</span>
        <span *ngIf="required" class="text-red-500 dark:text-red-400 ml-1">*</span>
      </label>
      
      <div class="relative">
        <input
          [id]="id"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readonly"
          [required]="required"
          [attr.min]="min || null"
          [attr.max]="max || null"
          [(ngModel)]="value"
          (ngModelChange)="onChange($event)"
          (blur)="onTouched()"
          [ngClass]="{
            'input': true,
            'input-error': error,
            'input-disabled': disabled,
            'pl-10': prefixIcon
          }"
          [attr.autocomplete]="autocomplete"
        />
        
        <!-- Prefix Icon -->
        <div *ngIf="prefixIcon" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path [attr.d]="getIconPath(prefixIcon)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </div>
        
        <!-- Suffix Icon/Clear Button -->
        <button
          *ngIf="clearable && value && !disabled"
          type="button"
          (click)="clear()"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </button>
      </div>
      
      <p *ngIf="error" class="text-xs text-red-600 dark:text-red-400 mt-1.5">{{ error }}</p>
      <p *ngIf="hint && !error" class="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{{ hint }}</p>
      <p *ngIf="helperText && !error && !hint" class="text-xs text-slate-400 dark:text-slate-500 mt-1">({{ helperText }})</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .input-error {
      @apply border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500;
    }
    
    .input-disabled {
      @apply opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800;
    }
  `]
})
export class FormInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'datetime-local' = 'text';
  @Input() placeholder = '';
  @Input() icon = '';
  @Input() prefixIcon = '';
  @Input() error = '';
  @Input() hint = '';
  @Input() helperText = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() clearable = false;
  @Input() autocomplete = '';
  @Input() min: number | string = '';
  @Input() max: number | string = '';
  @Input() id = `input-${Math.random().toString(36).substr(2, 9)}`;

  value: any = '';
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  clear() {
    this.value = '';
    this.onChange(this.value);
  }

  getIconPath(iconName?: string): string {
    const name = iconName || this.icon;
    const icons: any = {
      user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
      calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    };
    return icons[name] || '';
  }
}
