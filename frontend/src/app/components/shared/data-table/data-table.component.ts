import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  template?: TemplateRef<any>;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableAction {
  icon: string;
  label: string;
  color?: 'primary' | 'danger' | 'secondary';
  condition?: (row: any) => boolean;
  handler: (row: any) => void;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-container">
      <!-- Table Header -->
      <div *ngIf="title || subtitle" class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <p *ngIf="title" class="text-sm font-semibold text-slate-900 dark:text-white">{{ title }}</p>
          <p *ngIf="subtitle" class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ subtitle }}</p>
        </div>
        <div class="flex items-center gap-2">
          <ng-content select="[header-actions]"></ng-content>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th *ngIf="selectable" class="w-12">
                <input
                  type="checkbox"
                  [checked]="isAllSelected()"
                  (change)="toggleSelectAll()"
                  class="checkbox-input"
                />
              </th>
              <th
                *ngFor="let column of columns"
                [style.width]="column.width"
                [class]="'text-' + (column.align || 'left')"
                [class.cursor-pointer]="column.sortable"
                (click)="column.sortable && sortBy(column.key)"
              >
                <div class="flex items-center gap-2" [class.justify-center]="column.align === 'center'" [class.justify-end]="column.align === 'right'">
                  <span>{{ column.label }}</span>
                  <svg
                    *ngIf="column.sortable"
                    class="w-4 h-4 text-slate-400"
                    [class.text-indigo-600]="sortColumn === column.key"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      *ngIf="sortColumn !== column.key || sortDirection === 'asc'"
                      d="M5 15l7-7 7 7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                    <path
                      *ngIf="sortColumn === column.key && sortDirection === 'desc'"
                      d="M19 9l-7 7-7-7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    />
                  </svg>
                </div>
              </th>
              <th *ngIf="actions && actions.length" class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of data; let i = index">
              <td *ngIf="selectable">
                <input
                  type="checkbox"
                  [checked]="isSelected(row)"
                  (change)="toggleSelect(row)"
                  class="checkbox-input"
                />
              </td>
              <td
                *ngFor="let column of columns"
                [class]="'text-' + (column.align || 'left')"
              >
                <ng-container *ngIf="column.template; else defaultCell">
                  <ng-container *ngTemplateOutlet="column.template; context: { $implicit: row, column: column }"></ng-container>
                </ng-container>
                <ng-template #defaultCell>
                  {{ getNestedValue(row, column.key) }}
                </ng-template>
              </td>
              <td *ngIf="actions && actions.length" class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    *ngFor="let action of getVisibleActions(row)"
                    (click)="action.handler(row)"
                    [title]="action.label"
                    class="btn-icon btn-ghost"
                    [ngClass]="{
                      'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400': action.color === 'primary',
                      'text-slate-400 hover:text-red-500': action.color === 'danger',
                      'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300': !action.color || action.color === 'secondary'
                    }"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path [attr.d]="getActionIconPath(action.icon)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr *ngIf="!data || data.length === 0">
              <td [attr.colspan]="getColspan()" class="py-0">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg class="w-7 h-7 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path [attr.d]="emptyIcon" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>
                    </svg>
                  </div>
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ emptyTitle }}</p>
                  <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">{{ emptyMessage }}</p>
                </div>
              </td>
            </tr>

            <!-- Loading State -->
            <tr *ngIf="loading">
              <td [attr.colspan]="getColspan()" class="py-16">
                <div class="flex justify-center">
                  <svg class="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer/Pagination -->
      <div *ngIf="pagination" class="card-footer flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Showing <span class="font-semibold text-slate-700 dark:text-slate-300">{{ pagination.from }}</span>
          to <span class="font-semibold text-slate-700 dark:text-slate-300">{{ pagination.to }}</span>
          of <span class="font-semibold text-slate-700 dark:text-slate-300">{{ pagination.total }}</span> records
        </p>
        <div class="pagination">
          <button
            (click)="onPageChange(pagination.currentPage - 1)"
            [disabled]="pagination.currentPage === 1"
            class="page-btn"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </button>
          <button
            *ngFor="let page of getPageNumbers()"
            (click)="onPageChange(page)"
            [ngClass]="page === pagination.currentPage ? 'page-btn-active' : 'page-btn'"
          >
            {{ page }}
          </button>
          <button
            (click)="onPageChange(pagination.currentPage + 1)"
            [disabled]="pagination.currentPage === pagination.totalPages"
            class="page-btn"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DataTableComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() actions?: TableAction[];
  @Input() selectable = false;
  @Input() loading = false;
  @Input() emptyTitle = 'No data found';
  @Input() emptyMessage = 'There are no records to display';
  @Input() emptyIcon = 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4';
  @Input() pagination?: {
    currentPage: number;
    totalPages: number;
    from: number;
    to: number;
    total: number;
  };

  @Output() pageChanged = new EventEmitter<number>();
  @Output() sortChanged = new EventEmitter<{ column: string; direction: 'asc' | 'desc' }>();
  @Output() selectionChanged = new EventEmitter<any[]>();

  selectedRows: any[] = [];
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  getColspan(): number {
    let count = this.columns.length;
    if (this.selectable) count++;
    if (this.actions && this.actions.length) count++;
    return count;
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortChanged.emit({ column, direction: this.sortDirection });
  }

  toggleSelect(row: any) {
    const index = this.selectedRows.indexOf(row);
    if (index > -1) {
      this.selectedRows.splice(index, 1);
    } else {
      this.selectedRows.push(row);
    }
    this.selectionChanged.emit(this.selectedRows);
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedRows = [];
    } else {
      this.selectedRows = [...this.data];
    }
    this.selectionChanged.emit(this.selectedRows);
  }

  isSelected(row: any): boolean {
    return this.selectedRows.includes(row);
  }

  isAllSelected(): boolean {
    return this.data.length > 0 && this.selectedRows.length === this.data.length;
  }

  getVisibleActions(row: any): TableAction[] {
    return this.actions?.filter(action => !action.condition || action.condition(row)) || [];
  }

  onPageChange(page: number) {
    this.pageChanged.emit(page);
  }

  getPageNumbers(): number[] {
    if (!this.pagination) return [];
    
    const maxVisible = 5;
    const { currentPage, totalPages } = this.pagination;
    const pages: number[] = [];
    
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (currentPage <= 3) {
      endPage = maxVisible;
    }
    
    if (currentPage > totalPages - 3) {
      startPage = totalPages - maxVisible + 1;
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getActionIconPath(icon: string): string {
    const icons: any = {
      edit: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z',
      delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      view: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      download: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      approve: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      reject: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return icons[icon] || icons.view;
  }
}
