import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-form-toggle',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormToggleComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex items-center justify-between gap-4">
      <div class="flex-1">
        <label [for]="id" class="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          {{ label }}
        </label>
        <p *ngIf="description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ description }}</p>
        <p *ngIf="error" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ error }}</p>
      </div>
      
      <button
        [id]="id"
        type="button"
        role="switch"
        [attr.aria-checked]="value"
        [disabled]="disabled"
        (click)="toggle()"
        [ngClass]="{
          'toggle-switch': true,
          'toggle-active': value,
          'toggle-inactive': !value,
          'opacity-50 cursor-not-allowed': disabled
        }"
      >
        <span
          [ngClass]="{
            'toggle-thumb': true,
            'toggle-thumb-active': value,
            'toggle-thumb-inactive': !value
          }"
        ></span>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .toggle-switch {
      @apply relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2;
    }
    
    .toggle-active {
      @apply bg-indigo-600;
    }
    
    .toggle-inactive {
      @apply bg-slate-200 dark:bg-slate-700;
    }
    
    .toggle-thumb {
      @apply pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out;
    }
    
    .toggle-thumb-active {
      @apply translate-x-5;
    }
    
    .toggle-thumb-inactive {
      @apply translate-x-0;
    }
  `]
})
export class FormToggleComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() description = '';
  @Input() error = '';
  @Input() disabled = false;
  @Input() id = `toggle-${Math.random().toString(36).substr(2, 9)}`;

  value = false;
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: boolean): void {
    this.value = value || false;
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

  toggle() {
    if (!this.disabled) {
      this.value = !this.value;
      this.onChange(this.value);
      this.onTouched();
    }
  }
}
