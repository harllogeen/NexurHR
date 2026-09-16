import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="{
      'flex items-center justify-center': true,
      'py-20': size === 'lg',
      'py-12': size === 'md',
      'py-4': size === 'sm'
    }">
      <svg
        [ngClass]="{
          'animate-spin': true,
          'h-12 w-12': size === 'lg',
          'h-8 w-8': size === 'md',
          'h-5 w-5': size === 'sm',
          'text-indigo-600': color === 'primary',
          'text-slate-600 dark:text-slate-400': color === 'default'
        }"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span *ngIf="text" class="ml-3 text-sm text-slate-600 dark:text-slate-400">{{ text }}</span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SpinnerComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() color: 'primary' | 'default' = 'primary';
  @Input() text = '';
}
