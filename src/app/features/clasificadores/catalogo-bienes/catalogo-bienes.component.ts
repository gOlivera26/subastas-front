import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-catalogo-bienes',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, LoadingSpinnerComponent],
  templateUrl: './catalogo-bienes.component.html',
})
export class CatalogoBienesComponent implements OnInit {
  private service = inject(CatalogoBienService);
  private objetoGastoService = inject(ObjetoGastoService);
  private vigenciaService = inject(VigenciaService);
  private orgService = inject(OrganizationService);
  auth = inject(AuthService);

  vigencias = signal<Vigencia[]>([]);
  organizaciones = signal<Organization[]>([]);
  objetosGasto = signal<ObjetoGasto[]>([]);
  selectedVigenciaId = signal<number | null>(null);
  treeNodes = signal<CatalogoBienTreeItem[]>([]);
  parentList = signal<CatalogoBien[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  expandedNodes = signal<Set<number>>(new Set());
  searchTerm = signal('');

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
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.treeNodes();
    return this.filterNodes(this.treeNodes(), term);
  });

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
  onVigenciaChange(event: any) { this.selectedVigenciaId.set(Number(event.target.value)); this.expandedNodes.set(new Set()); this.searchTerm.set(''); this.loadItems(); this.loadObjetosGasto(); }

  loadItems() {
    const id = this.selectedVigenciaId(); if (!id) return;
    this.loading.set(true);
    this.service.getAll(id).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res.success && res.data) { this.parentList.set(res.data); this.treeNodes.set(this.buildTree(res.data)); }
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

  confirmDelete(item: CatalogoBien) { if (!confirm(`¿Eliminar "${item.nItem}"?`)) return; this.service.delete(item.idItem).subscribe({ next: (res: any) => { if (res.success) { this.showSuccess('Eliminado.'); this.loadItems(); } }, error: () => this.error.set('Error.') }); }

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
