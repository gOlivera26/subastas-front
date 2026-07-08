import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProviderService, RubroBulkUploadResultDto, RubroListDto, RubroTreeDto, CreateRubroDto, UpdateRubroDto } from '../../../core/services/provider.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableAction, TableColumn } from '../../../shared/ui/smart-table/table.models';
import { Modal } from '../../../shared/ui/modal/modal';
import { ConfirmationService } from '../../../core/services/confirmation.service';

interface RubroUploadPreviewRow {
  idLegacy: string;
  idPadreLegacy: string;
  codigo: string;
  nombre: string;
  imputable: string;
  activo: string;
}

@Component({
  selector: 'app-rubros-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SearchableSelectComponent, SmartTableComponent, Modal],
  templateUrl: './rubros-list.component.html',
  styleUrls: ['./rubros-list.component.css'],
})
export class RubrosListComponent implements OnInit {
  private confirmation = inject(ConfirmationService);
  private providerService = inject(ProviderService);

  viewMode = signal<'list' | 'tree'>('list');

  rubros = signal<RubroListDto[]>([]);
  rubrosTree = signal<RubroTreeDto[]>([]);
  loading = signal(false);
  treeLoading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(20);
  totalRows = signal(0);
  searchTerm = signal('');
  treeSearchTerm = signal('');
  expandedNodes = signal<Set<number>>(new Set());

  isCreateModalOpen = signal(false);
  isEditModalOpen = signal(false);
  isUploadModalOpen = signal(false);
  isUploading = signal(false);
  uploadFile = signal<File | null>(null);
  uploadRows = signal<RubroUploadPreviewRow[]>([]);
  uploadResult = signal<RubroBulkUploadResultDto | null>(null);

  createForm = { codigo: '', descripcion: '', idRubroPadre: null as number | null, imputable: false };
  editForm = { id: 0, codigo: '', descripcion: '', idRubroPadre: null as number | null, imputable: false };

  allRubrosForSelect = signal<{ id: number; codigo: string; descripcion: string }[]>([]);

  rubroOptions = computed<SelectOption[]>(() =>
    this.allRubrosForSelect().map(r => ({ value: r.id, label: r.codigo + ' - ' + r.descripcion }))
  );

  filteredTree = computed(() => {
    const term = this.treeSearchTerm().toLowerCase().trim();
    const nodes = term ? this.filterTree(this.rubrosTree(), term) : this.rubrosTree();
    return this.sortTreeByHierarchy(nodes);
  });

  columns: TableColumn[] = [
    { key: 'codigo', header: 'Código', type: 'custom', sortable: true },
    { key: 'descripcion', header: 'Descripción', type: 'custom', sortable: true },
    { key: 'rubroPadre', header: 'Rubro Padre', type: 'custom' },
    { key: 'imputable', header: 'Imputable', type: 'custom' },
    { key: 'activo', header: 'Estado', type: 'custom' },
  ];

  actions: TableAction[] = [
    { action: 'edit', icon: 'pencil', tooltip: 'Editar rubro', color: 'text-[var(--color-cyan-spark)] hover:text-[var(--color-cyan-spark)]' },
    { action: 'delete', icon: 'trash-2', tooltip: 'Eliminar rubro', color: 'text-red-400 hover:text-red-300' },
  ];

  codigoTpl = viewChild<TemplateRef<any>>('codigoTpl');
  descripcionTpl = viewChild<TemplateRef<any>>('descripcionTpl');
  rubroPadreTpl = viewChild<TemplateRef<any>>('rubroPadreTpl');
  imputableTpl = viewChild<TemplateRef<any>>('imputableTpl');
  activoTpl = viewChild<TemplateRef<any>>('activoTpl');

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const codigo = this.codigoTpl();
    const descripcion = this.descripcionTpl();
    const rubroPadre = this.rubroPadreTpl();
    const imputable = this.imputableTpl();
    const activo = this.activoTpl();
    if (codigo) templates['codigo'] = codigo;
    if (descripcion) templates['descripcion'] = descripcion;
    if (rubroPadre) templates['rubroPadre'] = rubroPadre;
    if (imputable) templates['imputable'] = imputable;
    if (activo) templates['activo'] = activo;
    return templates;
  });

  sortKey = signal<string>('codigo');
  sortDirection = signal<'asc' | 'desc'>('asc');

  ngOnInit() { this.loadRubros(); }

  setViewMode(mode: 'list' | 'tree') {
    this.viewMode.set(mode);
    if (mode === 'tree' && this.rubrosTree().length === 0) this.loadTree();
  }

  onSort(event: { key: string; direction: 'asc' | 'desc' }) {
    this.sortKey.set(event.key);
    this.sortDirection.set(event.direction);
    this.currentPage.set(1);
    this.loadRubros();
  }

  onPageChange(page: number) { this.currentPage.set(page); this.loadRubros(); }

  loadRubros() {
    this.loading.set(true);
    this.providerService.getRubros(this.currentPage(), this.pageSize(), this.searchTerm() || undefined, this.sortKey(), this.sortDirection())
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.rubros.set(res.data.data || []);
            this.totalRows.set(res.data.total || 0);
          } else {
            this.rubros.set([]);
            this.totalRows.set(0);
          }
          this.loading.set(false);
        },
        error: () => { this.error.set('Error al cargar rubros'); this.loading.set(false); }
      });
  }

  loadTree() {
    this.treeLoading.set(true);
    this.providerService.getRubroTree().subscribe({
      next: (res) => {
        const tree = res.success && res.data ? res.data : [];
        this.rubrosTree.set(tree);
        this.expandedNodes.set(new Set(tree.filter(r => r.hasChildren || (r.children?.length || 0) > 0).slice(0, 8).map(r => r.id)));
        this.treeLoading.set(false);
      },
      error: () => { this.error.set('Error al cargar el árbol de rubros'); this.treeLoading.set(false); }
    });
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.loadRubros();
  }

  filterTree(nodes: RubroTreeDto[], term: string): RubroTreeDto[] {
    return nodes
      .map(node => {
        const matches = node.codigo.toLowerCase().includes(term) || node.descripcion.toLowerCase().includes(term);
        const children = this.filterTree(node.children || [], term);
        if (matches || children.length > 0) return { ...node, children };
        return null;
      })
      .filter((node): node is RubroTreeDto => node !== null);
  }

  private sortTreeByHierarchy(nodes: RubroTreeDto[]): RubroTreeDto[] {
    return [...nodes]
      .map(node => ({ ...node, children: this.sortTreeByHierarchy(node.children || []) }))
      .sort((a, b) => {
        const aHasChildren = (a.children?.length || 0) > 0 || a.hasChildren;
        const bHasChildren = (b.children?.length || 0) > 0 || b.hasChildren;
        if (aHasChildren !== bHasChildren) return aHasChildren ? -1 : 1;

        const aChildren = a.children?.length || 0;
        const bChildren = b.children?.length || 0;
        if (aChildren !== bChildren) return bChildren - aChildren;

        return a.descripcion.localeCompare(b.descripcion, 'es', { numeric: true, sensitivity: 'base' });
      });
  }

  handleTableAction(event: { action: string; row: RubroListDto }) {
    switch (event.action) {
      case 'edit':
        this.openEditModal(event.row);
        break;
      case 'delete':
        this.deleteRubro(event.row.id);
        break;
    }
  }

  toggleNode(rubroId: number, event: Event) {
    event.stopPropagation();
    const expanded = new Set(this.expandedNodes());
    if (expanded.has(rubroId)) expanded.delete(rubroId);
    else expanded.add(rubroId);
    this.expandedNodes.set(expanded);
  }
  isExpanded(rubroId: number): boolean { return this.expandedNodes().has(rubroId); }

  treeIndent(level: number): number {
    return Math.min(Math.max(Number(level) || 0, 0), 6) * 14;
  }

  openCreateModal() {
    this.createForm = { codigo: '', descripcion: '', idRubroPadre: null, imputable: false };
    this.loadAllRubrosForSelect();
    this.isCreateModalOpen.set(true);
  }

  openEditModal(rubro: RubroListDto | RubroTreeDto) {
    this.editForm = { id: rubro.id, codigo: rubro.codigo, descripcion: rubro.descripcion, idRubroPadre: rubro.idRubroPadre, imputable: rubro.imputable };
    this.loadAllRubrosForSelect();
    this.isEditModalOpen.set(true);
  }

  loadAllRubrosForSelect() {
    this.providerService.getRubros(1, 1000).subscribe({
      next: (res) => {
        if (res.success && res.data) this.allRubrosForSelect.set(res.data.data.map(r => ({ id: r.id, codigo: r.codigo, descripcion: r.descripcion })));
      }
    });
  }

  createRubro() {
    if (!this.createForm.codigo || !this.createForm.descripcion) { this.error.set('Complete los campos obligatorios'); return; }
    this.providerService.createRubro(this.createForm as CreateRubroDto).subscribe({
      next: (res) => {
        if (res.success) { this.success.set('Rubro creado exitosamente'); this.isCreateModalOpen.set(false); this.refreshRubros(); }
        else this.error.set(res.message);
      },
      error: () => this.error.set('Error al crear rubro')
    });
  }

  updateRubro() {
    if (!this.editForm.codigo || !this.editForm.descripcion) { this.error.set('Complete los campos obligatorios'); return; }
    this.providerService.updateRubro(this.editForm as UpdateRubroDto).subscribe({
      next: (res) => {
        if (res.success) { this.success.set('Rubro actualizado exitosamente'); this.isEditModalOpen.set(false); this.refreshRubros(); }
        else this.error.set(res.message);
      },
      error: () => this.error.set('Error al actualizar rubro')
    });
  }

  async deleteRubro(id: number) {
    if (!(await this.confirmation.confirm({ title: 'Eliminar rubro', message: '¿Eliminar el rubro seleccionado?', confirmText: 'Eliminar', type: 'danger' }))) return;
    this.providerService.deleteRubro(id).subscribe({
      next: (res) => {
        if (res.success) { this.success.set('Rubro eliminado'); this.refreshRubros(); }
        else this.error.set(res.message);
      },
      error: () => this.error.set('Error al eliminar rubro')
    });
  }

  openUploadModal() {
    this.uploadFile.set(null);
    this.uploadRows.set([]);
    this.uploadResult.set(null);
    this.isUploadModalOpen.set(true);
  }

  async onUploadFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.uploadFile.set(file);
    this.uploadRows.set([]);
    this.uploadResult.set(null);
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return;

    const headers = this.parseCsvLine(lines[0]).map(h => this.normalizeHeader(h));
    const indexOf = (column: string) => headers.indexOf(column);
    const idxLegacy = indexOf('ID_RUBRO_PROV');
    const idxParent = indexOf('ID_RUBRO_PROV_REL');
    const idxCodigo = indexOf('CODIGO');
    const idxNombre = indexOf('NOMBRE');
    const idxImputable = indexOf('IMPUTABLE');
    const idxActivo = indexOf('ACTIVO');

    const valueAt = (values: string[], index: number) => index >= 0 && index < values.length ? values[index].trim() : '';
    const rows: RubroUploadPreviewRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const codigo = valueAt(values, idxCodigo);
      const nombre = valueAt(values, idxNombre);
      if (!codigo && !nombre) continue;
      rows.push({
        idLegacy: valueAt(values, idxLegacy),
        idPadreLegacy: valueAt(values, idxParent),
        codigo,
        nombre,
        imputable: valueAt(values, idxImputable),
        activo: valueAt(values, idxActivo),
      });
    }

    this.uploadRows.set(rows);
  }

  uploadRubros() {
    const file = this.uploadFile();
    if (!file) { this.error.set('Seleccioná un archivo CSV.'); return; }
    this.isUploading.set(true);
    this.providerService.bulkUploadRubros(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        if (res.success && res.data) {
          this.uploadResult.set(res.data);
          this.success.set('Importación finalizada: ' + res.data.creados + ' creados, ' + res.data.actualizados + ' actualizados.');
          this.refreshRubros();
        } else {
          this.error.set(res.message || 'No se pudo importar el archivo.');
        }
      },
      error: (err) => { this.isUploading.set(false); this.error.set(err.error?.message || 'Error al importar rubros.'); }
    });
  }

  refreshRubros() {
    this.loadRubros();
    if (this.viewMode() === 'tree') this.loadTree();
  }

  closeModal() {
    this.isCreateModalOpen.set(false);
    this.isEditModalOpen.set(false);
    this.isUploadModalOpen.set(false);
    this.error.set(null);
  }

  clearMessages() { this.error.set(null); this.success.set(null); }

  private normalizeHeader(value: string): string {
    return value.trim().replace(/^['"]|['"]$/g, '').toUpperCase();
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ';' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }

    result.push(current);
    return result.map(v => v.replace(/^['"]|['"]$/g, '').trim());
  }

  trackByRubro(index: number, item: RubroTreeDto): number { return item.id; }
}
