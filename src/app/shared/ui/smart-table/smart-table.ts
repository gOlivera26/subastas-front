import { Component, EventEmitter, Output, TemplateRef, computed, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TableColumn, TableAction } from './table.models';

@Component({
  selector: 'app-smart-table',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './smart-table.html',
})
export class SmartTableComponent {
  data = input.required<any[]>();
  columns = input.required<TableColumn[]>();
  actions = input<TableAction[]>([]);
  customTemplates = input<Record<string, TemplateRef<any>>>({});
  loading = input<boolean>(false);
  pageSize = input<number>(10);

  serverSide = input<boolean>(false);
  totalServerItems = input<number>(0);
  @Output() pageChange = new EventEmitter<number>();
  @Output() searchChange = new EventEmitter<string>();

  selectable = input<boolean>(false);
  selectedIds = input<any[]>([]);
  @Output() selectedIdsChange = new EventEmitter<any[]>();
  @Output() onAction = new EventEmitter<{action: string, row: any}>();

  searchTerm = signal('');
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');

  currentPage = signal(1);
  private searchTimeout: any;

  constructor() {
    effect(() => {
      const d = this.data();
    }, { allowSignalWrites: true });
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    if (this.serverSide()) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.searchChange.emit(val);
      }, 500);
    }
  }

  processedData = computed(() => {
    let result = [...(this.data() || [])];
    const term = this.searchTerm().toLowerCase().trim();

    if (term && this.columns() && !this.serverSide()) {
      result = result.filter(row =>
        this.columns().some(col => {
          if (col.searchFields && col.searchFields.length > 0) {
            return col.searchFields.some(field => {
              const val = row[field]?.toString().toLowerCase() || '';
              return val.includes(term);
            });
          }
          const val = row[col.key]?.toString().toLowerCase() || '';
          return val.includes(term);
        })
      );
    }

    const colKey = this.sortColumn();
    const direction = this.sortDirection();

    if (colKey) {
      result.sort((a, b) => {
        const valA = a[colKey];
        const valB = b[colKey];

        if (valA === null || valA === undefined) return direction === 'asc' ? -1 : 1;
        if (valB === null || valB === undefined) return direction === 'asc' ? 1 : -1;

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  });

  paginatedData = computed(() => {
    const data = this.processedData();
    if (this.serverSide()) {
      return data;
    }
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return data.slice(start, start + size);
  });

  totalPages = computed(() => {
    const totalCount = this.serverSide() ? this.totalServerItems() : this.processedData().length;
    return Math.ceil(totalCount / this.pageSize()) || 1;
  });

  rangeInfo = computed(() => {
    const total = this.serverSide() ? this.totalServerItems() : this.processedData().length;
    if (total === 0) return '0 resultados';

    const page = this.currentPage();
    const size = this.pageSize();

    const start = (page - 1) * size + 1;
    let end = page * size;
    if (end > total) end = total;

    return `${start}-${end} de ${total}`;
  });

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      const newPage = this.currentPage() + 1;
      this.currentPage.set(newPage);
      if (this.serverSide()) {
        this.pageChange.emit(newPage);
      }
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      const newPage = this.currentPage() - 1;
      this.currentPage.set(newPage);
      if (this.serverSide()) {
        this.pageChange.emit(newPage);
      }
    }
  }

  isSelected(row: any): boolean {
    return this.selectedIds().includes(row.id);
  }

  isAllSelected = computed(() => {
    const pageData = this.paginatedData();
    if (pageData.length === 0) return false;
    const selected = this.selectedIds();
    return pageData.every(row => selected.includes(row.id));
  });

  toggleSelection(row: any) {
    const current = this.selectedIds();
    const id = row.id;
    let newSelection;
    if (current.includes(id)) {
      newSelection = current.filter(x => x !== id);
    } else {
      newSelection = [...current, id];
    }
    this.selectedIdsChange.emit(newSelection);
  }

  toggleAll() {
    const pageData = this.paginatedData();
    const allSelected = this.isAllSelected();
    let newSelection = [...this.selectedIds()];
    const pageIds = pageData.map(x => x.id);

    if (allSelected) {
      newSelection = newSelection.filter(id => !pageIds.includes(id));
    } else {
      pageIds.forEach(id => {
        if (!newSelection.includes(id)) newSelection.push(id);
      });
    }
    this.selectedIdsChange.emit(newSelection);
  }

  handleSort(column: TableColumn) {
    if (!column.sortable) return;
    if (this.sortColumn() === column.key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column.key);
      this.sortDirection.set('asc');
    }
  }

  handleAction(action: string, row: any) {
    this.onAction.emit({ action, row });
  }
}
