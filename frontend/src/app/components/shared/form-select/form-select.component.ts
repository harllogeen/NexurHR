import { Component, Input, forwardRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-group">
      <label *ngIf="label" [for]="id" class="label">
        <span>{{ label }}</span>
        <span *ngIf="required" class="text-red-500 dark:text-red-400 ml-1">*</span>
      </label>
      
      <select
        [id]="id"
        [(ngModel)]="value"
        (change)="onSelectChange($event)"
        (blur)="onTouched()"
        [disabled]="disabled"
        [required]="required"
        [ngClass]="{
          'select': true,
          'input-error': error,
          'input-disabled': disabled
        }"
      >
        <option *ngIf="placeholder" value="" disabled [selected]="!value">{{ placeholder }}</option>
        <option *ngFor="let option of options" [value]="option[valueKey]">
          {{ option[labelKey] }}
        </option>
      </select>
      
      <p *ngIf="error" class="text-xs text-red-600 dark:text-red-400 mt-1.5">{{ error }}</p>
      <p *ngIf="hint && !error" class="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{{ hint }}</p>
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
export class FormSelectComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select an option';
  @Input() options: any[] = [];
  @Input() valueKey = 'value';
  @Input() labelKey = 'label';
  @Input() error = '';
  @Input() hint = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() id = `select-${Math.random().toString(36).substr(2, 9)}`;
  @Output() selectionChange = new EventEmitter<any>();

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

  onSelectChange(event: any) {
    const selectedValue = event.target.value;
    this.onChange(selectedValue);
    const selectedOption = this.options.find(opt => opt[this.valueKey] === selectedValue);
    this.selectionChange.emit(selectedOption);
  }
}
