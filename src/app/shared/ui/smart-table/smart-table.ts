import { Component, EventEmitter, Output, TemplateRef, computed, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { TableColumn, TableAction } from './table.models';

@Component({
  selector: 'app-smart-table',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, LoadingSpinnerComponent],
  templateUrl: './smart-table.html',
  styleUrls: ['./smart-table.css'],
})
export class SmartTableComponent {
  data = input.required<any[]>();
  columns = input.required<TableColumn[]>();
  actions = input<TableAction[]>([]);
  customTemplates = input<Record<string, TemplateRef<any>>>({});
  loading = input<boolean>(false);
  pageSize = input<number>(10);
  searchPlaceholder = input<string>('Buscar en la tabla...');
  emptyMessage = input<string>('No se encontraron resultados.');
  emptySubMessage = input<string>('');
  showSearch = input<boolean>(true);
  tableLabel = input<string>('Tabla de datos');

  serverSide = input<boolean>(false);
  totalServerItems = input<number>(0);
  @Output() pageChange = new EventEmitter<number>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<{ key: string; direction: 'asc' | 'desc' }>();

  selectable = input<boolean>(false);
  selectedIds = input<any[]>([]);
  @Output() selectedIdsChange = new EventEmitter<any[]>();
  @Output() onAction = new EventEmitter<{action: string, row: any}>();

  readonly tableId = 'smart-table-' + Math.random().toString(36).slice(2, 10);
  searchTerm = signal('');
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');

  currentPage = signal(1);
  openActionsMenu = signal<string | null>(null);
  actionsMenuPosition = signal<{ top: number; left: number; maxHeight: number } | null>(null);
  private searchTimeout: any;
  private readonly collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

  constructor() {
    effect(() => {
      const d = this.data();
    }, { allowSignalWrites: true });
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.currentPage.set(1);
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

    if (colKey && !this.serverSide()) {
      result.sort((a, b) => {
        const valA = a[colKey];
        const valB = b[colKey];

        if (valA === null || valA === undefined) return direction === 'asc' ? -1 : 1;
        if (valB === null || valB === undefined) return direction === 'asc' ? 1 : -1;

        let comparison: number;
        if (typeof valA === 'string' || typeof valB === 'string') {
          comparison = this.collator.compare(String(valA), String(valB));
        } else {
          comparison = valA < valB ? -1 : valA > valB ? 1 : 0;
        }

        return direction === 'asc' ? comparison : -comparison;
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
      this.openActionsMenu.set(null);
      if (this.serverSide()) {
        this.pageChange.emit(newPage);
      }
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      const newPage = this.currentPage() - 1;
      this.currentPage.set(newPage);
      this.openActionsMenu.set(null);
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
    if (this.serverSide()) {
      this.currentPage.set(1);
      this.sortChange.emit({ key: column.key, direction: this.sortDirection() });
    }
  }

  ariaSort(column: TableColumn): 'ascending' | 'descending' | null {
    if (!column.sortable || this.sortColumn() !== column.key) return null;
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  sortButtonLabel(column: TableColumn): string {
    if (this.sortColumn() !== column.key) return `Ordenar por ${column.header}`;
    const nextDirection = this.sortDirection() === 'asc' ? 'descendente' : 'ascendente';
    return `Ordenar ${column.header} de forma ${nextDirection}`;
  }

  rowAccessibleLabel(row: any): string {
    const keys = ['nombre', 'nombreUsuario', 'descripcion', 'razonSocial', 'email', 'nroCotizacion', 'nroReserva', 'codigo', 'numeroObjeto', 'id'];
    for (const key of keys) {
      const value = row?.[key];
      if (value !== null && value !== undefined && `${value}`.trim().length > 0) return `${value}`.trim();
    }
    return 'fila';
  }

  actionLabel(action: TableAction, row: any): string {
    const label = action.tooltip || action.action || 'Acción';
    return `${label}: ${this.rowAccessibleLabel(row)}`;
  }

  private readonly actionsPopoverPrefix = 'smart-table-actions-' + Math.random().toString(36).slice(2, 9);

  private hasUsableRowIdentity(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    if (typeof value === 'string') return value.trim().length > 0 && value.trim() !== '0';
    return true;
  }

  rowActionKey(row: any, index: number): string {
    const identityKeys = [
      'idObjetoGasto',
      'idItem',
      'idCatProg',
      'idCategoriaProgramatica',
      'idMoneda',
      'idUnidadAdm',
      'idSubResponsable',
      'idSubResponsables',
      'idReserva',
      'idReservaDet',
      'idCotizacion',
      'idCotizacionDetalle',
      'idRenglon',
      'idUsuario',
      'idRol',
      'idProveedor',
      'idRubro',
      'idPersona',
      'idMensaje',
      'idModulo',
      'idPagina',
      'idOrganizacion',
      'idVigencia',
      'id',
      'numeroObjeto',
      'codigo',
      'nroReserva',
      'nroCotizacion'
    ];

    for (const key of identityKeys) {
      const value = row?.[key];
      if (this.hasUsableRowIdentity(value)) return `${key}-${value}-page-${this.currentPage()}-row-${index}`;
    }

    return `page-${this.currentPage()}-row-${index}`;
  }

  actionsPopoverId(row: any, index: number): string {
    return this.actionsPopoverPrefix + '-' + this.rowActionKey(row, index).replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  isActionsMenuOpen(key: string): boolean {
    return this.openActionsMenu() === key;
  }

  toggleActionsMenu(row: any, index: number, event?: Event) {
    event?.stopPropagation();
    const key = this.rowActionKey(row, index);
    const popoverId = this.actionsPopoverId(row, index);
    const popover = document.getElementById(popoverId) as HTMLElement & { showPopover?: () => void; hidePopover?: () => void } | null;

    if (this.openActionsMenu() === key) {
      popover?.hidePopover?.();
      this.closeActionsMenu();
      return;
    }

    this.closeActionsMenu();

    const target = event?.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const margin = 12;
      const gap = 8;
      const menuWidth = 240;
      const preferredHeight = 420;
      const minUsableHeight = 180;
      const visibleActions = this.actions().filter(action => this.isActionVisible(action, row)).length;
      const estimatedItemHeight = 40;
      const menuChrome = 12;
      const estimatedMenuHeight = Math.max(52, Math.min(preferredHeight, (visibleActions * estimatedItemHeight) + menuChrome));
      const availableBelow = Math.max(0, window.innerHeight - rect.bottom - gap - margin);
      const availableAbove = Math.max(0, rect.top - gap - margin);
      const openUp = availableBelow < Math.min(minUsableHeight, estimatedMenuHeight) && availableAbove > availableBelow;
      const availableSpace = openUp ? availableAbove : availableBelow;
      const maxHeight = Math.max(140, Math.min(preferredHeight, estimatedMenuHeight, availableSpace || estimatedMenuHeight));
      const menuHeight = Math.min(maxHeight, estimatedMenuHeight);
      const left = Math.max(margin, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - margin));
      const top = openUp
        ? Math.max(margin, rect.top - gap - menuHeight)
        : Math.max(margin, Math.min(rect.bottom + gap, window.innerHeight - menuHeight - margin));

      this.actionsMenuPosition.set({ top, left, maxHeight });
    }

    this.openActionsMenu.set(key);
    setTimeout(() => popover?.showPopover?.());
  }

  closeActionsMenu() {
    if (this.openActionsMenu()) {
      const id = this.actionsPopoverPrefix + '-' + this.openActionsMenu()!.replace(/[^a-zA-Z0-9_-]/g, '-');
      const current = document.getElementById(id) as HTMLElement & { hidePopover?: () => void } | null;
      current?.hidePopover?.();
    }
    this.openActionsMenu.set(null);
    this.actionsMenuPosition.set(null);
  }

  onActionsPopoverToggle(key: string, event: any) {
    if (event?.newState === 'closed' && this.openActionsMenu() === key) {
      this.openActionsMenu.set(null);
      this.actionsMenuPosition.set(null);
    }
  }

  isActionVisible(action: TableAction, row: any): boolean {
    return action.visible ? action.visible(row) : true;
  }

  handleActionFromMenu(action: string, row: any, event?: Event) {
    event?.stopPropagation();
    this.closeActionsMenu();
    this.handleAction(action, row);
  }

  handleAction(action: string, row: any) {
    this.closeActionsMenu();
    this.onAction.emit({ action, row });
  }

}



