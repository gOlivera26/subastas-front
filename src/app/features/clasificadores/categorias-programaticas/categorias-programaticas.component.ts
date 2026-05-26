import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-categorias-programaticas', standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, LoadingSpinnerComponent],
  templateUrl: './categorias-programaticas.component.html',
})
export class CategoriasProgramaticasComponent implements OnInit {
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

  treeNodes = signal<CategoriaTreeItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  expandedNodes = signal<Set<number>>(new Set());
  searchTerm = signal('');

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
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.treeNodes();
    return this.filterNodes(this.treeNodes(), term);
  });

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

  onVigenciaChange(e: any) {
    this.selectedVigenciaId.set(Number(e.target.value));
    this.expandedNodes.set(new Set());
    this.searchTerm.set('');
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
          this.treeNodes.set(this.buildTree(res.data));
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

  confirmDelete(item: CategoriaProgramatica) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
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
