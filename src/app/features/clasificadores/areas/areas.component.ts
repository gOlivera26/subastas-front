import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { SubResponsableService, SubResponsableRequest, SubResponsableBulkItem } from '../../../core/services/sub-responsable.service';
import { UnidadAdministrativaService } from '../../../core/services/unidad-administrativa.service';
import { AuthService } from '../../../core/services/auth.service';
import { SubResponsable } from '../../../core/models/sub-responsable.model';
import { UnidadAdministrativa } from '../../../core/models/unidad-administrativa.model';

interface BulkRow { codigo: string; nombre: string; nombreUA: string; }

@Component({
  selector: 'app-areas', standalone: true,
  imports: [FormsModule, LucideAngularModule, DataTableComponent, CellTemplateDirective],
  templateUrl: './areas.component.html',
})
export class AreasComponent implements OnInit {
  private service = inject(SubResponsableService);
  private uaService = inject(UnidadAdministrativaService);
  auth = inject(AuthService);

  unidadesAdm = signal<UnidadAdministrativa[]>([]);
  selectedUaId = signal<number | null>(null);
  items = signal<SubResponsable[]>([]);
  parentList = signal<SubResponsable[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isModalOpen = signal(false); isEditing = signal(false); isSaving = signal(false); editingId = signal<number | null>(null);
  form: SubResponsableRequest = { codigo: '', nombre: '', idSubRespRel: undefined, vigente: true, idUnidadAdm: undefined };

  isUploadOpen = signal(false);
  uploadRows = signal<BulkRow[]>([]);
  isUploading = signal(false);

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => { const m: Record<string, TemplateRef<any>> = {}; this.cellTemplateDirectives().forEach(d => m[d.cellKey] = d.templateRef); return m; });
  columns: TableColumn[] = [{ key: 'codigo', label: 'Código', width: '120px' }, { key: 'nombre', label: 'Nombre' }, { key: 'unidadAdmNombre', label: 'UA' }, { key: 'vigente', label: 'Estado', width: '100px' }, { key: 'acciones', label: 'Acciones', align: 'right', width: '100px' }];

  ngOnInit() { this.loadUAs(); this.loadItems(); }

  loadUAs() { this.uaService.getAll().subscribe({ next: (r: any) => { if (r.success && r.data) this.unidadesAdm.set(r.data); } }); }
  onUaChange(e: any) { const v = e.target.value; this.selectedUaId.set(v && v !== 'null' ? Number(v) : null); this.loadItems(); }
  loadItems() { this.isLoading.set(true); this.service.getAll(this.selectedUaId() ?? undefined).subscribe({ next: (r: any) => { this.isLoading.set(false); if (r.success && r.data) { this.items.set(r.data); this.parentList.set(r.data); } else this.items.set([]); }, error: () => { this.isLoading.set(false); this.items.set([]); } }); }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = { codigo: '', nombre: '', idSubRespRel: undefined, vigente: true, idUnidadAdm: this.selectedUaId() ?? undefined }; this.isModalOpen.set(true); }
  openEditModal(item: SubResponsable) { this.isEditing.set(true); this.editingId.set(item.idSubResponsable); this.form = { codigo: item.codigo, nombre: item.nombre, idSubRespRel: item.idSubRespRel, vigente: item.vigente, idUnidadAdm: item.idUnidadAdm }; this.isModalOpen.set(true); }
  closeModal() { this.isModalOpen.set(false); }

  save() { if (!this.form.nombre || !this.form.codigo) return; this.isSaving.set(true); const o = this.isEditing() && this.editingId() != null ? this.service.update(this.editingId()!, this.form) : this.service.create(this.form); o.subscribe({ next: (r: any) => { this.isSaving.set(false); if (r.success) { this.closeModal(); this.showSuccess('Guardado.'); this.loadItems(); } }, error: (e: any) => { this.isSaving.set(false); this.errorMessage.set(e.error?.message || 'Error.'); } }); }

  confirmDelete(item: SubResponsable) { if (!confirm(`¿Eliminar "${item.nombre}"?`)) return; this.service.delete(item.idSubResponsable).subscribe({ next: (r: any) => { if (r.success) { this.showSuccess('Eliminado.'); this.loadItems(); } }, error: () => this.errorMessage.set('Error.') }); }

  openUpload() { this.uploadRows.set([]); this.isUploadOpen.set(true); }

  async onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    const text = await input.files[0].text();
    const lines = text.split('\n').filter(l => l.trim());
    const rows: BulkRow[] = [];
    const first = lines[0] || '';
    const sep = first.includes(';') ? ';' : first.includes('|') ? '|' : ',';
    const clean = (v: string) => v.replace(/^["']|["']$/g, '').trim();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => clean(c));
      if (cols.length >= 2 && cols[0]) rows.push({ codigo: cols[0], nombre: cols[1], nombreUA: cols[2] || '' });
    }
    this.uploadRows.set(rows);
  }

  async uploadCsv() {
    this.isUploading.set(true);
    const items: SubResponsableBulkItem[] = this.uploadRows().map(r => ({
      codigo: r.codigo, nombre: r.nombre, nombreUnidadAdm: r.nombreUA || undefined
    }));
    this.service.bulkUpload(items).subscribe({
      next: (r) => { this.isUploading.set(false); if (r.success) { this.isUploadOpen.set(false); this.showSuccess(`${r.data} áreas importadas.`); this.loadItems(); } else { this.errorMessage.set(r.message || 'Error.'); } },
      error: (e) => { this.isUploading.set(false); this.errorMessage.set(e.error?.message || 'Error.'); }
    });
  }

  private showSuccess(m: string) { this.successMessage.set(m); setTimeout(() => this.successMessage.set(null), 3000); }
}
