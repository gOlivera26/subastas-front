import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CategoriaProgramaticaService, CategoriaProgramaticaRequest, CategoriaProgramaticaBulkItem } from '../../../core/services/categoria-programatica.service';
import { CategoriaProgramatica, CategoriaTreeItem } from '../../../core/models/categoria-programatica.model';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { UnidadAdministrativaService } from '../../../core/services/unidad-administrativa.service';
import { UnidadAdministrativa } from '../../../core/models/unidad-administrativa.model';
import { AuthService } from '../../../core/services/auth.service';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableAction, TableColumn } from '../../../shared/ui/smart-table/table.models';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-categorias-programaticas', standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, CustomSelect, SmartTableComponent],
  templateUrl: './categorias-programaticas.component.html',
})
export class CategoriasProgramaticasComponent implements OnInit {
  private confirmation = inject(ConfirmationService);
  private service = inject(CategoriaProgramaticaService);
  private vigenciaService = inject(VigenciaService);
  private orgService = inject(OrganizationService);
  private uaService = inject(UnidadAdministrativaService);
  auth = inject(AuthService);

  vigencias = signal<Vigencia[]>([]);
  organizaciones = signal<Organization[]>([]);
  unidadesAdm = signal<UnidadAdministrativa[]>([]);
  selectedVigenciaId = signal<number | null>(null);
  parentList = signal<CategoriaProgramatica[]>([]);
  viewMode = signal<'list' | 'tree'>('list');
  treeSearchTerm = signal('');

  treeNodes = signal<CategoriaTreeItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  expandedNodes = signal<Set<number>>(new Set());
  jerarquiaTpl = viewChild<TemplateRef<any>>('jerarquiaTpl');
  codigoTpl = viewChild<TemplateRef<any>>('codigoTpl');
  unidadTpl = viewChild<TemplateRef<any>>('unidadTpl');
  nivelTpl = viewChild<TemplateRef<any>>('nivelTpl');
  hijosTpl = viewChild<TemplateRef<any>>('hijosTpl');
  naturalezaTpl = viewChild<TemplateRef<any>>('naturalezaTpl');

  columns: TableColumn[] = [
    { header: 'Jerarquía', key: 'jerarquia', type: 'custom', sortable: true, searchFields: ['nombre', 'codigo', 'unidadAdmNombre', 'naturaleza', 'tipoJerarquia'] },
    { header: 'Nivel', key: 'nivelOrden', type: 'custom', sortable: true },
    { header: 'Hijos', key: 'descendientes', type: 'custom', sortable: true },
    { header: 'Código', key: 'codigo', type: 'custom', sortable: true },
    { header: 'UA', key: 'unidadAdmNombre', type: 'custom', sortable: true },
    { header: 'Nat.', key: 'naturaleza', type: 'custom', sortable: true },
  ];

  actions: TableAction[] = [
    { action: 'edit', icon: 'pencil', tooltip: 'Editar categoría', color: 'text-[var(--color-cyan-spark)] hover:text-[var(--color-cyan-spark)]' },
    { action: 'delete', icon: 'trash-2', tooltip: 'Eliminar categoría', color: 'text-red-400 hover:text-red-300' },
  ];

  uploadColumns: TableColumn[] = [
    { key: 'codigo', header: 'Código', sortable: true },
    { key: 'nombre', header: 'Nombre', sortable: true },
    { key: 'naturaleza', header: 'Nat.', sortable: true },
    { key: 'nombreUA', header: 'UA (nombre)', sortable: true },
  ];


  isUploadOpen = signal(false);
  uploadRows = signal<{ codigo: string; nombre: string; naturaleza: string; nombreUA: string }[]>([]);
  uploadOrgId = signal<number | undefined>(undefined);
  isUploading = signal(false);

  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);
  form: CategoriaProgramaticaRequest = this.getEmptyForm();

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
    const unidad = this.unidadTpl();
    const naturaleza = this.naturalezaTpl();
    const nivel = this.nivelTpl();
    const hijos = this.hijosTpl();

    if (jerarquia) templates['jerarquia'] = jerarquia;
    if (codigo) templates['codigo'] = codigo;
    if (unidad) templates['unidadAdmNombre'] = unidad;
    if (naturaleza) templates['naturaleza'] = naturaleza;
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
    ...this.parentList().map(p => ({ label: `${p.codigo} - ${p.nombre}`, value: p.idCatProg }))
  ]);

  organizacionOptions = computed<SelectOption[]>(() => [
    { label: 'Global', value: undefined },
    ...this.organizaciones().map(o => ({ label: o.nombre, value: o.idOrganizacion }))
  ]);

  unidadAdmOptions = computed<SelectOption[]>(() => [
    { label: 'Ninguna', value: undefined },
    ...this.unidadesAdm().map(ua => ({ label: ua.nombreUnidadAdm, value: ua.idUnidadAdm }))
  ]);

  naturalezaOptions: SelectOption[] = [
    { label: 'Ninguna', value: '' },
    { label: 'AC', value: 'AC' },
    { label: 'CO', value: 'CO' },
    { label: 'PR', value: 'PR' },
    { label: 'SP', value: 'SP' },
    { label: 'OB', value: 'OB' },
    { label: 'IN', value: 'IN' },
  ];


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
  getEmptyForm(): CategoriaProgramaticaRequest { return { idVigencia: this.selectedVigenciaId() || 0, codigo: 0, nombre: '', idCatProgRel: undefined, idOrganizacion: undefined, idUnidadAdm: undefined, naturaleza: '' }; }

  buildTree(flat: CategoriaProgramatica[]): CategoriaTreeItem[] {
    const map = new Map<number, CategoriaTreeItem>();
    for (const item of flat) { map.set(item.idCatProg, { ...item, children: [] }); }
    const parentIds = new Set(flat.map(i => i.idCatProgRel).filter(id => id != null)) as Set<number>;
    for (const [, node] of map) {
      node.hasChildren = parentIds.has(node.idCatProg);
    }
    const roots: CategoriaTreeItem[] = [];
    for (const [, node] of map) {
      if (node.idCatProgRel != null && map.has(node.idCatProgRel)) {
        map.get(node.idCatProgRel)!.children.push(node);
      } else { roots.push(node); }
    }
    return roots;
  }

  flattenTree(nodes: CategoriaTreeItem[], level = 0): Array<CategoriaTreeItem & { id: number; level: number; nivelOrden: number; jerarquia: string; childCount: number; descendientes: number; tipoJerarquia: string }> {
    return nodes.flatMap(node => {
      const childCount = node.children?.length || 0;
      const descendientes = this.countDescendants(node);
      const row = {
        ...node,
        id: node.idCatProg,
        level,
        nivelOrden: level,
        jerarquia: node.nombre || '',
        childCount,
        descendientes,
        tipoJerarquia: descendientes > childCount ? 'Con nietos' : childCount > 0 ? 'Con hijos' : 'Sin hijos'
      };
      const children = node.hasChildren && this.isExpanded(node.idCatProg)
        ? this.flattenTree(node.children, level + 1)
        : [];
      return [row, ...children];
    });
  }

  countDescendants(node: CategoriaTreeItem): number {
    return (node.children || []).reduce((total, child) => total + 1 + this.countDescendants(child), 0);
  }

  private sortTreeByHierarchy(nodes: CategoriaTreeItem[]): CategoriaTreeItem[] {
    return [...nodes]
      .map(node => ({ ...node, children: this.sortTreeByHierarchy(node.children || []) }))
      .sort((a, b) => {
        const aDesc = this.countDescendants(a);
        const bDesc = this.countDescendants(b);
        const aHasChildren = aDesc > 0 || a.hasChildren;
        const bHasChildren = bDesc > 0 || b.hasChildren;
        if (aHasChildren !== bHasChildren) return aHasChildren ? -1 : 1;
        if (aDesc !== bDesc) return bDesc - aDesc;
        return (a.nombre || '').localeCompare(b.nombre || '', 'es', { numeric: true, sensitivity: 'base' });
      });
  }

  treeIndent(level: number): number {
    return Math.min(Math.max(Number(level) || 0, 0), 6) * 14;
  }

  expandAll() {
    const ids = new Set<number>();
    const visit = (nodes: CategoriaTreeItem[]) => nodes.forEach(node => {
      if (node.hasChildren) ids.add(node.idCatProg);
      visit(node.children || []);
    });
    visit(this.treeNodes());
    this.expandedNodes.set(ids);
  }

  collapseAll() { this.expandedNodes.set(new Set()); }

  filterNodes(nodes: CategoriaTreeItem[], term: string): CategoriaTreeItem[] {
    return nodes.map(node => {
      const matches = node.nombre.toLowerCase().includes(term) ||
        String(node.codigo).includes(term) ||
        (node.unidadAdmNombre || '').toLowerCase().includes(term);
      const filteredChildren = this.filterNodes(node.children, term);
      if (matches || filteredChildren.length > 0) return { ...node, children: filteredChildren };
      return null;
    }).filter((n): n is CategoriaTreeItem => n !== null);
  }

  loadVigencias() {
    this.vigenciaService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const s = res.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigencias.set(s);
          const a = s.find((v: any) => v.activoEjecucion);
          if (a) this.selectedVigenciaId.set(a.idVigencia);
          else if (s.length) this.selectedVigenciaId.set(s[0].idVigencia);
          if (this.selectedVigenciaId()) { this.loadItems(); this.loadUnidades(); }
          else this.loading.set(false);
        } else this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.error.set('Error al cargar.'); }
    });
  }

  loadOrganizaciones() { this.orgService.getActiveOrganizations().subscribe({ next: (res: any) => { if (res.success && res.data) this.organizaciones.set(res.data); } }); }
  loadUnidades() { const id = this.selectedVigenciaId(); if (!id) return; this.uaService.getByVigencia(id).subscribe({ next: (res: any) => { if (res.success && res.data) this.unidadesAdm.set(res.data); } }); }

  onVigenciaChange(value: any) {
    this.selectedVigenciaId.set(Number(value));
    this.expandedNodes.set(new Set());
    this.treeSearchTerm.set('');
    this.loadItems();
    this.loadUnidades();
  }

  loadItems() {
    const id = this.selectedVigenciaId(); if (!id) return;
    this.loading.set(true);
    this.service.getAll(id).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.parentList.set(res.data);
          const tree = this.buildTree(res.data);
          this.treeNodes.set(tree);
          this.expandedNodes.set(new Set(tree.filter(n => n.hasChildren || (n.children?.length || 0) > 0).slice(0, 8).map(n => n.idCatProg)));
        } else { this.treeNodes.set([]); }
      },
      error: () => { this.loading.set(false); this.treeNodes.set([]); this.error.set('Error al cargar.'); }
    });
  }

  toggleNode(id: number, event: Event) {
    event.stopPropagation();
    const expanded = new Set(this.expandedNodes());
    if (expanded.has(id)) { expanded.delete(id); } else { expanded.add(id); }
    this.expandedNodes.set(expanded);
  }

  isExpanded(id: number): boolean { return this.expandedNodes().has(id); }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = this.getEmptyForm(); this.isModalOpen.set(true); }
  openEditModal(item: CategoriaProgramatica) { this.isEditing.set(true); this.editingId.set(item.idCatProg); this.form = { idCatProgRel: item.idCatProgRel, idOrganizacion: item.idOrganizacion, idUnidadAdm: item.idUnidadAdm, idVigencia: item.idVigencia, codigo: item.codigo, nombre: item.nombre, naturaleza: item.naturaleza || '' }; this.isModalOpen.set(true); }
  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.nombre || !this.form.codigo) return;
    this.isSaving.set(true);
    const op = this.isEditing() && this.editingId() != null
      ? this.service.update(this.editingId()!, this.form)
      : this.service.create(this.form);
    op.subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        if (res.success) { this.closeModal(); this.showSuccess('Guardado exitosamente.'); this.loadItems(); }
      },
      error: (err: any) => { this.isSaving.set(false); this.error.set(err.error?.message || 'Error al guardar.'); }
    });
  }

  async confirmDelete(item: CategoriaProgramatica) {
    if (!(await this.confirmation.confirm({ title: 'Eliminar categoría programática', message: `¿Eliminar "${item.nombre}"?`, confirmText: 'Eliminar', type: 'danger' }))) return;
    this.service.delete(item.idCatProg).subscribe({
      next: (res: any) => { if (res.success) { this.showSuccess('Eliminado.'); this.loadItems(); } },
      error: () => this.error.set('Error al eliminar.')
    });
  }

  private showSuccess(m: string) { this.success.set(m); setTimeout(() => this.success.set(null), 3000); }
  trackByFn(_index: number, item: CategoriaTreeItem): number { return item.idCatProg; }

  openUpload() { this.uploadRows.set([]); this.uploadOrgId.set(this.auth.isSuperAdmin() ? undefined : undefined); this.isUploadOpen.set(true); }

  async onUploadFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    const text = await input.files[0].text();
    const lines = text.split('\n').filter(l => l.trim());
    const rows: { codigo: string; nombre: string; naturaleza: string; nombreUA: string }[] = [];
    const first = lines[0] || '';
    const sep = first.includes(';') ? ';' : first.includes('|') ? '|' : ',';
    const clean = (v: string) => v.replace(/^["']|["']$/g, '').trim();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => clean(c));
      if (cols.length >= 2 && cols[0]) rows.push({ codigo: cols[0], nombre: cols[1], naturaleza: cols[2] || '', nombreUA: cols[3] || '' });
    }
    this.uploadRows.set(rows);
  }

  async uploadCsv() {
    this.isUploading.set(true);
    const items: CategoriaProgramaticaBulkItem[] = this.uploadRows().map(r => ({
      codigo: Number(r.codigo), nombre: r.nombre, naturaleza: r.naturaleza || undefined, nombreUnidadAdm: r.nombreUA || undefined
    }));
    const orgId = this.uploadOrgId();
    this.service.bulkUpload(items, orgId).subscribe({
      next: (r: any) => { this.isUploading.set(false); if (r.success) { this.isUploadOpen.set(false); this.showSuccess(`${r.data} categorías importadas.`); this.loadItems(); } else { this.error.set(r.message || 'Error.'); } },
      error: (e: any) => { this.isUploading.set(false); this.error.set(e.error?.message || 'Error.'); }
    });
  }
}
