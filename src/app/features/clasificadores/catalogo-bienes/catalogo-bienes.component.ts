import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { CatalogoBienService, CatalogoBienRequest } from '../../../core/services/catalogo-bien.service';
import { ObjetoGastoService } from '../../../core/services/objeto-gasto.service';
import { CatalogoBien } from '../../../core/models/catalogo-bien.model';
import { ObjetoGasto } from '../../../core/models/objeto-gasto.model';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-catalogo-bienes',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, DataTableComponent, CellTemplateDirective],
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
  items = signal<CatalogoBien[]>([]);
  parentList = signal<CatalogoBien[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);
  form: CatalogoBienRequest = this.getEmptyForm();

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => { map[d.cellKey] = d.templateRef; });
    return map;
  });

  columns: TableColumn[] = [
    { key: 'codigo', label: 'Código', width: '120px' },
    { key: 'nItem', label: 'Nombre' },
    { key: 'objetoGastoNombre', label: 'Objeto Gasto' },
    { key: 'idItemRel', label: 'Padre', width: '100px' },
    { key: 'organizacionNombre', label: 'Org.', width: '80px' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '100px' },
  ];

  ngOnInit() { this.loadVigencias(); this.loadOrganizaciones(); }

  getEmptyForm(): CatalogoBienRequest { return { codigo: '', nItem: '', idVigencia: this.selectedVigenciaId() || 0, idOrganizacion: undefined, idItemRel: undefined, idObjetoGasto: undefined }; }

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
          else this.isLoading.set(false);
        } else this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); this.errorMessage.set('Error al cargar vigencias.'); }
    });
  }

  loadOrganizaciones() { this.orgService.getActiveOrganizations().subscribe({ next: (res: any) => { if (res.success && res.data) this.organizaciones.set(res.data); } }); }

  loadObjetosGasto() { const id = this.selectedVigenciaId(); if (!id) return; this.objetoGastoService.getAll(id).subscribe({ next: (res: any) => { if (res.success && res.data) this.objetosGasto.set(res.data); } }); }

  onVigenciaChange(event: any) { this.selectedVigenciaId.set(Number(event.target.value)); this.loadItems(); this.loadObjetosGasto(); }

  loadItems() {
    const id = this.selectedVigenciaId(); if (!id) return;
    this.isLoading.set(true);
    this.service.getAll(id).subscribe({
      next: (res: any) => { this.isLoading.set(false); if (res.success && res.data) { this.items.set(res.data); this.parentList.set(res.data); } else this.items.set([]); },
      error: () => { this.isLoading.set(false); this.items.set([]); this.errorMessage.set('Error al cargar.'); }
    });
  }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = this.getEmptyForm(); this.isModalOpen.set(true); }

  openEditModal(item: CatalogoBien) {
    this.isEditing.set(true); this.editingId.set(item.idItem);
    this.form = { codigo: item.codigo, nItem: item.nItem, idVigencia: item.idVigencia, idOrganizacion: item.idOrganizacion, idItemRel: item.idItemRel, idObjetoGasto: item.idObjetoGasto };
    this.isModalOpen.set(true);
  }

  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.nItem || !this.form.codigo) return;
    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null ? this.service.update(this.editingId()!, this.form) : this.service.create(this.form);
    obs.subscribe({
      next: (res: any) => { this.isSaving.set(false); if (res.success) { this.closeModal(); this.showSuccess('Guardado.'); this.loadItems(); } },
      error: (err: any) => { this.isSaving.set(false); this.errorMessage.set(err.error?.message || 'Error al guardar.'); }
    });
  }

  confirmDelete(item: CatalogoBien) {
    if (!confirm(`¿Eliminar "${item.nItem}"?`)) return;
    this.service.delete(item.idItem).subscribe({
      next: (res: any) => { if (res.success) { this.showSuccess('Eliminado.'); this.loadItems(); } },
      error: () => this.errorMessage.set('Error al eliminar.')
    });
  }

  private showSuccess(msg: string) { this.successMessage.set(msg); setTimeout(() => this.successMessage.set(null), 3000); }
}
