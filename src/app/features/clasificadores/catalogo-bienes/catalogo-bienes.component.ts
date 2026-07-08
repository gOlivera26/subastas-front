import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CatalogoBienService, CatalogoBienRequest, CatalogoBienBulkItem } from '../../../core/services/catalogo-bien.service';
import { ObjetoGastoService } from '../../../core/services/objeto-gasto.service';
import { CatalogoBien, CatalogoBienTreeItem } from '../../../core/models/catalogo-bien.model';
import { ObjetoGasto } from '../../../core/models/objeto-gasto.model';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableAction, TableColumn } from '../../../shared/ui/smart-table/table.models';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-catalogo-bienes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, CustomSelect, SmartTableComponent],
  templateUrl: './catalogo-bienes.component.html',
})
export class CatalogoBienesComponent implements OnInit {
  private confirmation = inject(ConfirmationService);
  private service = inject(CatalogoBienService);
  private objetoGastoService = inject(ObjetoGastoService);
  private vigenciaService = inject(VigenciaService);
  private orgService = inject(OrganizationService);
  auth = inject(AuthService);

  vigencias = signal<Vigencia[]>([]);
  organizaciones = signal<Organization[]>([]);
  objetosGasto = signal<ObjetoGasto[]>([]);
  selectedVigenciaId = signal<number | null>(null);
  viewMode = signal<'list' | 'tree'>('list');
  treeSearchTerm = signal('');
  treeNodes = signal<CatalogoBienTreeItem[]>([]);
  parentList = signal<CatalogoBien[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  expandedNodes = signal<Set<number>>(new Set());
  jerarquiaTpl = viewChild<TemplateRef<any>>('jerarquiaTpl');
  codigoTpl = viewChild<TemplateRef<any>>('codigoTpl');
  objetoGastoTpl = viewChild<TemplateRef<any>>('objetoGastoTpl');
  nivelTpl = viewChild<TemplateRef<any>>('nivelTpl');
  hijosTpl = viewChild<TemplateRef<any>>('hijosTpl');
  organizacionTpl = viewChild<TemplateRef<any>>('organizacionTpl');

  columns: TableColumn[] = [
    { header: 'Jerarquía', key: 'jerarquia', type: 'custom', sortable: true, searchFields: ['nItem', 'codigo', 'objetoGastoNombre', 'organizacionNombre', 'tipoJerarquia'] },
    { header: 'Nivel', key: 'nivelOrden', type: 'custom', sortable: true },
    { header: 'Hijos', key: 'descendientes', type: 'custom', sortable: true },
    { header: 'Código', key: 'codigo', type: 'custom', sortable: true },
    { header: 'Objeto Gasto', key: 'objetoGastoNombre', type: 'custom', sortable: true },
    { header: 'Org.', key: 'organizacionNombre', type: 'custom', sortable: true },
  ];

  actions: TableAction[] = [
    { action: 'edit', icon: 'pencil', tooltip: 'Editar bien', color: 'text-[var(--color-cyan-spark)] hover:text-[var(--color-cyan-spark)]' },
    { action: 'delete', icon: 'trash-2', tooltip: 'Eliminar bien', color: 'text-red-400 hover:text-red-300' },
  ];

  uploadColumns: TableColumn[] = [
    { key: 'idItem', header: 'ID', sortable: true },
    { key: 'idItemRel', header: 'Padre', sortable: true },
    { key: 'codigo', header: 'Código', sortable: true },
    { key: 'nItem', header: 'Nombre', sortable: true },
    { key: 'numeroObjeto', header: 'Obj. Gasto', sortable: true },
  ];


  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);
  form: CatalogoBienRequest = this.getEmptyForm();

  isUploadOpen = signal(false);
  uploadRows = signal<{ idItem: string; idItemRel: string; codigo: string; nItem: string; numeroObjeto: string }[]>([]);
  uploadOrgId = signal<number | undefined>(undefined);
  isUploading = signal(false);

  filteredTree = computed(() => {
    const term = this.treeSearchTerm().toLowerCase().trim();
    const nodes = term ? this.filterNodes(this.treeNodes(), term) : this.treeNodes();
    return this.sortTreeByHierarchy(nodes);
  });

  visibleRows = computed(() => this.flattenTree(this.filteredTree()));

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const jerarquia = this.jerarquiaTpl();
    const codigo = this.codigoTpl();
    const objetoGasto = this.objetoGastoTpl();
    const organizacion = this.organizacionTpl();
    const nivel = this.nivelTpl();
    const hijos = this.hijosTpl();

    if (jerarquia) templates['jerarquia'] = jerarquia;
    if (codigo) templates['codigo'] = codigo;
    if (objetoGasto) templates['objetoGastoNombre'] = objetoGasto;
    if (organizacion) templates['organizacionNombre'] = organizacion;
    if (nivel) templates['nivelOrden'] = nivel;
    if (hijos) templates['descendientes'] = hijos;

    return templates;
  });

  vigenciaOptions = computed<SelectOption[]>(() => this.vigencias().map(v => ({
    label: `Ejercicio ${v.ejercicio}${v.activoEjecucion ? ' (Activo)' : ''}`,
    value: v.idVigencia
  })));

  parentOptions = computed<SelectOption[]>(() => [
    { label: 'Ninguno (raíz)', value: undefined },
    ...this.parentList().map(p => ({ label: `${p.codigo} - ${p.nItem}`, value: p.idItem }))
  ]);

  objetoGastoOptions = computed<SelectOption[]>(() => [
    { label: 'Ninguno', value: undefined },
    ...this.objetosGasto().map(og => ({ label: `${og.numeroObjeto} - ${og.nombreObjeto}`, value: og.idObjetoGasto }))
  ]);

  organizacionOptions = computed<SelectOption[]>(() => [
    { label: 'Ninguna / Global', value: undefined },
    ...this.organizaciones().map(org => ({ label: org.nombre, value: org.idOrganizacion }))
  ]);


  setViewMode(mode: 'list' | 'tree') {
    this.viewMode.set(mode);
  }

  handleTableAction(event: { action: string; row: any }) {
    switch (event.action) {
      case 'edit':
        this.openEditModal(event.row);
        break;
      case 'delete':
        this.confirmDelete(event.row);
        break;
    }
  }

  ngOnInit() { this.loadVigencias(); this.loadOrganizaciones(); }

  getEmptyForm(): CatalogoBienRequest { return { codigo: '', nItem: '', idVigencia: this.selectedVigenciaId() || 0, idOrganizacion: undefined, idItemRel: undefined, idObjetoGasto: undefined }; }

  buildTree(flat: CatalogoBien[]): CatalogoBienTreeItem[] {
    const map = new Map<number, CatalogoBienTreeItem>();
    for (const item of flat) { map.set(item.idItem, { ...item, children: [], hasChildren: false }); }
    const parentIds = new Set(flat.map(i => i.idItemRel).filter(id => id != null)) as Set<number>;
    for (const [, node] of map) { node.hasChildren = parentIds.has(node.idItem); }
    const roots: CatalogoBienTreeItem[] = [];
    for (const [, node] of map) {
      if (node.idItemRel != null && map.has(node.idItemRel)) {
        map.get(node.idItemRel)!.children.push(node);
      } else { roots.push(node); }
    }
    return roots;
  }

  flattenTree(nodes: CatalogoBienTreeItem[], level = 0): Array<CatalogoBienTreeItem & { id: number; level: number; nivelOrden: number; jerarquia: string; childCount: number; descendientes: number; tipoJerarquia: string }> {
    return nodes.flatMap(node => {
      const childCount = node.children?.length || 0;
      const descendientes = this.countDescendants(node);
      const row = {
        ...node,
        id: node.idItem,
        level,
        nivelOrden: level,
        jerarquia: node.nItem || '',
        childCount,
        descendientes,
        tipoJerarquia: descendientes > childCount ? 'Con nietos' : childCount > 0 ? 'Con hijos' : 'Sin hijos'
      };
      const children = node.hasChildren && this.isExpanded(node.idItem)
        ? this.flattenTree(node.children, level + 1)
        : [];
      return [row, ...children];
    });
  }

  countDescendants(node: CatalogoBienTreeItem): number {
    return (node.children || []).reduce((total, child) => total + 1 + this.countDescendants(child), 0);
  }

  private sortTreeByHierarchy(nodes: CatalogoBienTreeItem[]): CatalogoBienTreeItem[] {
    return [...nodes]
      .map(node => ({ ...node, children: this.sortTreeByHierarchy(node.children || []) }))
      .sort((a, b) => {
        const aDesc = this.countDescendants(a);
        const bDesc = this.countDescendants(b);
        const aHasChildren = aDesc > 0 || a.hasChildren;
        const bHasChildren = bDesc > 0 || b.hasChildren;
        if (aHasChildren !== bHasChildren) return aHasChildren ? -1 : 1;
        if (aDesc !== bDesc) return bDesc - aDesc;
        return (a.nItem || '').localeCompare(b.nItem || '', 'es', { numeric: true, sensitivity: 'base' });
      });
  }

  treeIndent(level: number): number {
    return Math.min(Math.max(Number(level) || 0, 0), 6) * 14;
  }

  expandAll() {
    const ids = new Set<number>();
    const visit = (nodes: CatalogoBienTreeItem[]) => nodes.forEach(node => {
      if (node.hasChildren) ids.add(node.idItem);
      visit(node.children || []);
    });
    visit(this.treeNodes());
    this.expandedNodes.set(ids);
  }

  collapseAll() { this.expandedNodes.set(new Set()); }

  filterNodes(nodes: CatalogoBienTreeItem[], term: string): CatalogoBienTreeItem[] {
    return nodes.map(node => {
      const matches = (node.nItem || '').toLowerCase().includes(term) ||
        (node.codigo || '').toLowerCase().includes(term) ||
        (node.objetoGastoNombre || '').toLowerCase().includes(term);
      const filteredChildren = this.filterNodes(node.children, term);
      if (matches || filteredChildren.length > 0) return { ...node, children: filteredChildren };
      return null;
    }).filter((n): n is CatalogoBienTreeItem => n !== null);
  }

  loadVigencias() {
    this.vigenciaService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const sorted = res.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigencias.set(sorted);
          const activa = sorted.find((v: any) => v.activoEjecucion);
          if (activa) this.selectedVigenciaId.set(activa.idVigencia);
          else if (sorted.length > 0) this.selectedVigenciaId.set(sorted[0].idVigencia);
          if (this.selectedVigenciaId()) { this.loadItems(); this.loadObjetosGasto(); }
          else this.loading.set(false);
        } else this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.error.set('Error al cargar vigencias.'); }
    });
  }

  loadOrganizaciones() { this.orgService.getActiveOrganizations().subscribe({ next: (res: any) => { if (res.success && res.data) this.organizaciones.set(res.data); } }); }
  loadObjetosGasto() { const id = this.selectedVigenciaId(); if (!id) return; this.objetoGastoService.getAll(id).subscribe({ next: (res: any) => { if (res.success && res.data) this.objetosGasto.set(res.data); } }); }
  onVigenciaChange(value: any) { this.selectedVigenciaId.set(Number(value)); this.expandedNodes.set(new Set()); this.treeSearchTerm.set(''); this.loadItems(); this.loadObjetosGasto(); }

  loadItems() {
    const id = this.selectedVigenciaId(); if (!id) return;
    this.loading.set(true);
    this.service.getAll(id).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res.success && res.data) { this.parentList.set(res.data); const tree = this.buildTree(res.data); this.treeNodes.set(tree); this.expandedNodes.set(new Set(tree.filter(n => n.hasChildren || (n.children?.length || 0) > 0).slice(0, 8).map(n => n.idItem))); }
        else this.treeNodes.set([]);
      },
      error: () => { this.loading.set(false); this.treeNodes.set([]); this.error.set('Error al cargar.'); }
    });
  }

  toggleNode(id: number, event: Event) { event.stopPropagation(); const e = new Set(this.expandedNodes()); if (e.has(id)) e.delete(id); else e.add(id); this.expandedNodes.set(e); }
  isExpanded(id: number): boolean { return this.expandedNodes().has(id); }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = this.getEmptyForm(); this.isModalOpen.set(true); }
  openEditModal(item: CatalogoBien) { this.isEditing.set(true); this.editingId.set(item.idItem); this.form = { codigo: item.codigo, nItem: item.nItem, idVigencia: item.idVigencia, idOrganizacion: item.idOrganizacion, idItemRel: item.idItemRel, idObjetoGasto: item.idObjetoGasto }; this.isModalOpen.set(true); }
  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.nItem || !this.form.codigo) return;
    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null ? this.service.update(this.editingId()!, this.form) : this.service.create(this.form);
    obs.subscribe({ next: (res: any) => { this.isSaving.set(false); if (res.success) { this.closeModal(); this.showSuccess('Guardado.'); this.loadItems(); } }, error: (err: any) => { this.isSaving.set(false); this.error.set(err.error?.message || 'Error al guardar.'); } });
  }

  async confirmDelete(item: CatalogoBien) { if (!(await this.confirmation.confirm({ title: 'Eliminar bien', message: `¿Eliminar "${item.nItem}"?`, confirmText: 'Eliminar', type: 'danger' }))) return; this.service.delete(item.idItem).subscribe({ next: (res: any) => { if (res.success) { this.showSuccess('Eliminado.'); this.loadItems(); } }, error: () => this.error.set('Error.') }); }

  private showSuccess(m: string) { this.success.set(m); setTimeout(() => this.success.set(null), 3000); }
  trackByFn(_index: number, item: CatalogoBienTreeItem): number { return item.idItem; }

  openUpload() { this.uploadRows.set([]); this.isUploadOpen.set(true); }

  async onUploadFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    const text = await input.files[0].text();
    const lines = text.split('\n').filter(l => l.trim());
    const rows: { idItem: string; idItemRel: string; codigo: string; nItem: string; numeroObjeto: string }[] = [];
    const first = lines[0] || '';
    const sep = first.includes(';') ? ';' : first.includes('|') ? '|' : ',';
    const clean = (v: string) => v.replace(/["']/g, '').trim();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => clean(c));
      if (cols.length >= 4 && cols[2]) rows.push({ idItem: cols[0] || '', idItemRel: cols[1] || '', codigo: cols[2], nItem: cols[3] || '', numeroObjeto: cols[4] || '' });
    }
    this.uploadRows.set(rows);
  }

  async uploadCsv() {
    this.isUploading.set(true);
    const items: CatalogoBienBulkItem[] = this.uploadRows().map(r => ({
      idItem: Number(r.idItem) || 0, idItemRel: r.idItemRel ? Number(r.idItemRel) : undefined, codigo: r.codigo, nItem: r.nItem, numeroObjeto: r.numeroObjeto
    }));
    this.service.bulkUpload(items, this.uploadOrgId()).subscribe({
      next: (r: any) => { this.isUploading.set(false); if (r.success) { this.isUploadOpen.set(false); this.showSuccess(`${r.data} bienes importados.`); this.loadItems(); } else { this.error.set(r.message || 'Error.'); } },
      error: (e: any) => { this.isUploading.set(false); this.error.set(e.error?.message || 'Error.'); }
    });
  }
}
