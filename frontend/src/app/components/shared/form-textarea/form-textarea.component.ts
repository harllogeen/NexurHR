import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormTextareaComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-group">
      <label *ngIf="label" [for]="id" class="label">
        <span>{{ label }}</span>
        <span *ngIf="required" class="text-red-500 dark:text-red-400 ml-1">*</span>
      </label>
      
      <textarea
        [id]="id"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [required]="required"
        [rows]="rows"
        [(ngModel)]="value"
        (ngModelChange)="onChange($event)"
        (blur)="onTouched()"
        [ngClass]="{
          'input': true,
          'resize-none': !resizable,
          'input-error': error,
          'input-disabled': disabled
        }"
        [maxlength]="maxLength"
      ></textarea>
      
      <div *ngIf="showCount && maxLength" class="flex justify-between items-center mt-1.5">
        <p *ngIf="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</p>
        <p *ngIf="hint && !error" class="text-xs text-slate-500 dark:text-slate-400">{{ hint }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 ml-auto">
          {{ (value || '').length }} / {{ maxLength }}
        </p>
      </div>
      <div *ngIf="!showCount || !maxLength">
        <p *ngIf="error" class="text-xs text-red-600 dark:text-red-400 mt-1.5">{{ error }}</p>
        <p *ngIf="hint && !error" class="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{{ hint }}</p>
      </div>
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
export class FormTextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() error = '';
  @Input() hint = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() rows = 4;
  @Input() resizable = true;
  @Input() maxLength = 0;
  @Input() showCount = false;
  @Input() id = `textarea-${Math.random().toString(36).substr(2, 9)}`;

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
}
