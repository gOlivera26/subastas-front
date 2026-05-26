import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { ObjetoGastoService, ObjetoGastoRequest, ObjetoGastoBulkItem } from '../../../core/services/objeto-gasto.service';
import { ObjetoGasto } from '../../../core/models/objeto-gasto.model';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-objetos-gasto',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DataTableComponent, CellTemplateDirective],
  templateUrl: './objetos-gasto.component.html',
})
export class ObjetosGastoComponent implements OnInit {
  private service = inject(ObjetoGastoService);
  private vigenciaService = inject(VigenciaService);
  private orgService = inject(OrganizationService);
  auth = inject(AuthService);

  vigencias = signal<Vigencia[]>([]);
  organizaciones = signal<Organization[]>([]);
  selectedVigenciaId = signal<number | null>(null);
  items = signal<ObjetoGasto[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);
  parentList = signal<ObjetoGasto[]>([]);
  form: ObjetoGastoRequest = this.getEmptyForm();

  isUploadOpen = signal(false);
  uploadRows = signal<{ idObjetoGasto: string; idObjetoGastoRel: string; numeroObjeto: string; nombreObjeto: string; imputaEjecucion: string }[]>([]);
  uploadOrgId = signal<number | undefined>(undefined);
  isUploading = signal(false);

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => { map[d.cellKey] = d.templateRef; });
    return map;
  });

  columns: TableColumn[] = [
    { key: 'numeroObjeto', label: 'Número', width: '120px' },
    { key: 'nombreObjeto', label: 'Nombre' },
    { key: 'idObjetoGastoRel', label: 'Padre', width: '100px' },
    { key: 'imputaEjecucion', label: 'Ejecución', width: '100px' },
    { key: 'organizacionNombre', label: 'Org.', width: '100px' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '100px' },
  ];

  ngOnInit() { this.loadVigencias(); this.loadOrganizaciones(); }

  getEmptyForm(): ObjetoGastoRequest { return { numeroObjeto: '', nombreObjeto: '', idVigencia: this.selectedVigenciaId() || 0, idOrganizacion: undefined, idObjetoGastoRel: undefined, imputaEjecucion: false }; }

  loadVigencias() {
    this.vigenciaService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const sorted = res.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigencias.set(sorted);
          const activa = sorted.find((v: any) => v.activoEjecucion);
          if (activa) this.selectedVigenciaId.set(activa.idVigencia);
          else if (sorted.length > 0) this.selectedVigenciaId.set(sorted[0].idVigencia);
          if (this.selectedVigenciaId()) this.loadItems();
          else this.isLoading.set(false);
        } else this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); this.errorMessage.set('Error al cargar vigencias.'); }
    });
  }

  loadOrganizaciones() { this.orgService.getActiveOrganizations().subscribe({ next: (res: any) => { if (res.success && res.data) this.organizaciones.set(res.data); } }); }

  onVigenciaChange(event: any) { this.selectedVigenciaId.set(Number(event.target.value)); this.loadItems(); }

  loadItems() {
    const id = this.selectedVigenciaId(); if (!id) return;
    this.isLoading.set(true);
    this.service.getAll(id).subscribe({
      next: (res: any) => { this.isLoading.set(false); if (res.success && res.data) { this.items.set(res.data); this.parentList.set(res.data); } else this.items.set([]); },
      error: (err: any) => { this.isLoading.set(false); this.items.set([]); this.errorMessage.set(err.error?.message || err.message || 'Error al cargar.'); }
    });
  }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = this.getEmptyForm(); this.isModalOpen.set(true); }

  openEditModal(item: ObjetoGasto) {
    this.isEditing.set(true); this.editingId.set(item.idObjetoGasto);
    this.form = { numeroObjeto: item.numeroObjeto, nombreObjeto: item.nombreObjeto, idVigencia: item.idVigencia, idOrganizacion: item.idOrganizacion, idObjetoGastoRel: item.idObjetoGastoRel, imputaEjecucion: item.imputaEjecucion };
    this.isModalOpen.set(true);
  }

  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.nombreObjeto || !this.form.numeroObjeto) return;
    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null ? this.service.update(this.editingId()!, this.form) : this.service.create(this.form);
    obs.subscribe({
      next: (res: any) => { this.isSaving.set(false); if (res.success) { this.closeModal(); this.showSuccess('Guardado.'); this.loadItems(); } },
      error: (err: any) => { this.isSaving.set(false); this.errorMessage.set(err.error?.message || 'Error al guardar.'); }
    });
  }

  confirmDelete(item: ObjetoGasto) {
    if (!confirm(`¿Eliminar "${item.nombreObjeto}"?`)) return;
    this.service.delete(item.idObjetoGasto).subscribe({
      next: (res: any) => { if (res.success) { this.showSuccess('Eliminado.'); this.loadItems(); } },
      error: () => this.errorMessage.set('Error al eliminar.')
    });
  }

  private showSuccess(msg: string) { this.successMessage.set(msg); setTimeout(() => this.successMessage.set(null), 3000); }

  openUpload() { this.uploadRows.set([]); this.isUploadOpen.set(true); }

  async onUploadFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    const text = await input.files[0].text();
    const lines = text.split('\n').filter(l => l.trim());
    const rows: { idObjetoGasto: string; idObjetoGastoRel: string; numeroObjeto: string; nombreObjeto: string; imputaEjecucion: string }[] = [];
    const first = lines[0] || '';
    const sep = first.includes(';') ? ';' : first.includes('|') ? '|' : ',';
    const clean = (v: string) => v.replace(/["']/g, '').trim();
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => clean(c));
      if (cols.length >= 3 && cols[2]) rows.push({ idObjetoGasto: cols[0] || '', idObjetoGastoRel: cols[1] || '', numeroObjeto: cols[2], nombreObjeto: cols[3] || '', imputaEjecucion: cols[4] || '' });
    }
    this.uploadRows.set(rows);
  }

  async uploadCsv() {
    this.isUploading.set(true);
    const items: ObjetoGastoBulkItem[] = this.uploadRows().map(r => ({
      idObjetoGasto: Number(r.idObjetoGasto) || 0, idObjetoGastoRel: r.idObjetoGastoRel ? Number(r.idObjetoGastoRel) : undefined, numeroObjeto: r.numeroObjeto, nombreObjeto: r.nombreObjeto, imputaEjecucion: r.imputaEjecucion === '1' || r.imputaEjecucion.toLowerCase() === 'true' || r.imputaEjecucion.toLowerCase() === 'si'
    }));
    this.service.bulkUpload(items, this.uploadOrgId()).subscribe({
      next: (r: any) => { this.isUploading.set(false); if (r.success) { this.isUploadOpen.set(false); this.showSuccess(`${r.data} objetos de gasto importados.`); this.loadItems(); } else { this.errorMessage.set(r.message || 'Error.'); } },
      error: (e: any) => { this.isUploading.set(false); this.errorMessage.set(e.error?.message || 'Error.'); }
    });
  }
}
