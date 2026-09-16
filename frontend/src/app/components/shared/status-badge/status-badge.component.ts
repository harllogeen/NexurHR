import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      [ngClass]="{
        'badge': true,
        'badge-green': variant === 'success',
        'badge-blue': variant === 'info' || variant === 'primary',
        'badge-amber': variant === 'warning',
        'badge-red': variant === 'error' || variant === 'danger',
        'badge-red-light': variant === 'cancelled',
        'badge-purple': variant === 'purple',
        'badge-slate': variant === 'default' || !variant
      }"
      [class]="customClass"
    >
      <span *ngIf="dot" class="status-dot" [ngClass]="{
        'status-active': variant === 'success',
        'status-pending': variant === 'warning',
        'status-inactive': variant === 'default'
      }"></span>
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class StatusBadgeComponent {
  @Input() variant: 'success' | 'error' | 'warning' | 'info' | 'primary' | 'danger' | 'purple' | 'cancelled' | 'default' = 'default';
  @Input() dot = false;
  @Input() customClass = '';
}
