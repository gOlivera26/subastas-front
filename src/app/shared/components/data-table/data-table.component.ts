import { Component, input, output, computed, signal, TemplateRef, ContentChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SortEvent {
  key: string;
  direction: 'asc' | 'desc';
}

export interface PageEvent {
  page: number;
  pageSize: number;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T = any> {
  columns = input<TableColumn[]>([]);
  data = input<T[]>([]);
  totalRows = input<number>(0);
  loading = input<boolean>(false);
  currentPage = input<number>(1);
  pageSize = input<number>(20);
  emptyMessage = input<string>('No se encontraron resultados');
  emptySubMessage = input<string>('Intenta con otros términos de búsqueda.');
  cellTemplates = input<Record<string, TemplateRef<any>>>({});

  sortChange = output<SortEvent>();
  pageChange = output<PageEvent>();

  sortKey = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc' | null>(null);

  totalPages = computed(() => Math.ceil(this.totalRows() / this.pageSize()) || 1);

  getCellTemplate(key: string): TemplateRef<any> | null {
    return this.cellTemplates()[key] || null;
  }

  getCellValue(row: any, key: string): any {
    return row[key];
  }

  onSort(key: string) {
    const col = this.columns().find(c => c.key === key);
    if (!col?.sortable) return;

    if (this.sortKey() === key) {
      const newDir = this.sortDirection() === 'asc' ? 'desc' : 'asc';
      this.sortDirection.set(newDir);
      this.sortChange.emit({ key, direction: newDir });
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
      this.sortChange.emit({ key, direction: 'asc' });
    }
  }

  getSortIcon(key: string): string {
    if (this.sortKey() !== key) return 'chevrons-up-down';
    return this.sortDirection() === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  getSortIconClass(key: string): string {
    if (this.sortKey() !== key) return 'text-[var(--color-storm-cloud)]';
    return 'text-[var(--color-cyan-spark)]';
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.pageChange.emit({ page: this.currentPage() - 1, pageSize: this.pageSize() });
    }
  }

  nextPage() {
    if ((this.currentPage() * this.pageSize()) < this.totalRows()) {
      this.pageChange.emit({ page: this.currentPage() + 1, pageSize: this.pageSize() });
    }
  }
}
