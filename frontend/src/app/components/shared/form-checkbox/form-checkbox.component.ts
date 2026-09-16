import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormCheckboxComponent),
      multi: true
    }
  ],
  template: `
    <div class="flex items-start gap-3">
      <input
        [id]="id"
        type="checkbox"
        [(ngModel)]="value"
        (change)="onChange(value)"
        (blur)="onTouched()"
        [disabled]="disabled"
        [required]="required"
        class="checkbox-input mt-0.5"
      />
      <label [for]="id" class="flex-1 cursor-pointer select-none">
        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ label }}</span>
        <p *ngIf="description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ description }}</p>
        <p *ngIf="error" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ error }}</p>
      </label>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class FormCheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() description = '';
  @Input() error = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() id = `checkbox-${Math.random().toString(36).substr(2, 9)}`;

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
}
