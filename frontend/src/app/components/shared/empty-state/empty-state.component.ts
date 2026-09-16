import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state py-16">
      <div class="empty-state-icon">
        <svg class="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path [attr.d]="getIconPath()" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>
        </svg>
      </div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-white mb-2">{{ title }}</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EmptyStateComponent {
  @Input() title = 'No data found';
  @Input() message = 'There are no records to display';
  @Input() icon: 'inbox' | 'search' | 'file' | 'users' | 'folder' = 'inbox';

  getIconPath(): string {
    const icons: any = {
      inbox: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
      search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
    };
    return icons[this.icon] || icons.inbox;
  }
}
