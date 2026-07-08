import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UnidadAdministrativaService, UnidadAdministrativaRequest } from '../../../core/services/unidad-administrativa.service';
import { UnidadAdministrativa } from '../../../core/models/unidad-administrativa.model';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableAction, TableColumn } from '../../../shared/ui/smart-table/table.models';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-unidades-administrativas',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, SmartTableComponent, CustomSelect],
  templateUrl: './unidades-administrativas.component.html',
})
export class UnidadesAdministrativasComponent implements OnInit {
  private confirmation = inject(ConfirmationService);
  private unidadService = inject(UnidadAdministrativaService);
  private vigenciaService = inject(VigenciaService);
  private orgService = inject(OrganizationService);
  auth = inject(AuthService);

  vigencias = signal<Vigencia[]>([]);
  organizaciones = signal<Organization[]>([]);
  selectedVigenciaId = signal<number | null>(null);
  unidades = signal<UnidadAdministrativa[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  showAvanzado = signal(false);
  editingId = signal<number | null>(null);
  form: UnidadAdministrativaRequest = this.getEmptyForm();

  numeroUnidadAdmTpl = viewChild<TemplateRef<any>>('numeroUnidadAdmTpl');
  organizacionNombreTpl = viewChild<TemplateRef<any>>('organizacionNombreTpl');
  mailTpl = viewChild<TemplateRef<any>>('mailTpl');

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const numeroUnidadAdm = this.numeroUnidadAdmTpl();
    const organizacionNombre = this.organizacionNombreTpl();
    const mail = this.mailTpl();

    if (numeroUnidadAdm) templates['numeroUnidadAdm'] = numeroUnidadAdm;
    if (organizacionNombre) templates['organizacionNombre'] = organizacionNombre;
    if (mail) templates['mail'] = mail;

    return templates;
  });

  columns: TableColumn[] = [
    { key: 'numeroUnidadAdm', header: 'Nro', type: 'custom', sortable: true },
    { key: 'nombreUnidadAdm', header: 'Nombre / Descripción', sortable: true },
    { key: 'organizacionNombre', header: 'Organización', type: 'custom', sortable: true },
    { key: 'mail', header: 'Email', type: 'custom' },
  ];


  actions: TableAction[] = [
    { action: 'edit', icon: 'pencil', tooltip: 'Editar unidad', color: 'text-[var(--color-cyan-spark)] hover:text-[var(--color-cyan-spark)]' },
    { action: 'delete', icon: 'trash-2', tooltip: 'Eliminar unidad', color: 'text-red-400 hover:text-red-300' },
  ];
  vigenciaOptions = computed<SelectOption[]>(() => this.vigencias().map(v => ({
    label: `Ejercicio ${v.ejercicio}${v.activoEjecucion ? ' (Activo)' : ''}`,
    value: v.idVigencia
  })));

  organizacionOptions = computed<SelectOption[]>(() => [
    { label: 'Ninguna / Global', value: undefined },
    ...this.organizaciones().map(org => ({ label: org.nombre, value: org.idOrganizacion }))
  ]);


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

  loadOrganizaciones() { this.orgService.getActiveOrganizations().subscribe({ next: (res: any) => { if (res.success && res.data) { this.organizaciones.set(res.data); } } }); }

  getEmptyForm(): UnidadAdministrativaRequest { return { numeroUnidadAdm: 0, nombreUnidadAdm: '', idVigencia: this.selectedVigenciaId() || 0, idOrganizacion: undefined, mail: '', alias: '', puerto: undefined, smtp: '' }; }

  loadVigencias() {
    this.isLoading.set(true);
    this.vigenciaService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const sorted = res.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigencias.set(sorted);
          const activa = sorted.find((v: any) => v.activoEjecucion);
          if (activa) this.selectedVigenciaId.set(activa.idVigencia);
          else if (sorted.length > 0) this.selectedVigenciaId.set(sorted[0].idVigencia);
          if (this.selectedVigenciaId()) this.loadUnidades();
          else this.isLoading.set(false);
        } else this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); this.errorMessage.set('Error al cargar las vigencias.'); }
    });
  }

  onVigenciaChange(value: any) { this.selectedVigenciaId.set(Number(value)); this.loadUnidades(); }

  loadUnidades() {
    const vigenciaId = this.selectedVigenciaId(); if (!vigenciaId) return;
    this.isLoading.set(true);
    this.unidadService.getByVigencia(vigenciaId).subscribe({
      next: (res: any) => { this.isLoading.set(false); if (res.success && res.data) { this.unidades.set(res.data); } else { this.unidades.set([]); } },
      error: () => { this.isLoading.set(false); this.unidades.set([]); this.errorMessage.set('Error al cargar las unidades administrativas.'); }
    });
  }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = this.getEmptyForm(); this.showAvanzado.set(false); this.isModalOpen.set(true); }

  openEditModal(unidad: UnidadAdministrativa) {
    this.isEditing.set(true); this.editingId.set(unidad.idUnidadAdm);
    this.form = { numeroUnidadAdm: unidad.numeroUnidadAdm, nombreUnidadAdm: unidad.nombreUnidadAdm, idVigencia: unidad.idVigencia, idOrganizacion: unidad.idOrganizacion, mail: unidad.mail || '', alias: unidad.alias || '', puerto: unidad.puerto, smtp: unidad.smtp || '' };
    this.showAvanzado.set(!!(unidad.mail || unidad.smtp)); this.isModalOpen.set(true);
  }

  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.nombreUnidadAdm || !this.form.numeroUnidadAdm) return;
    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null ? this.unidadService.update(this.editingId()!, this.form) : this.unidadService.create(this.form);
    obs.subscribe({
      next: (res: any) => { this.isSaving.set(false); if (res.success) { this.closeModal(); this.showSuccess(this.isEditing() ? 'Unidad actualizada correctamente.' : 'Unidad creada correctamente.'); this.loadUnidades(); } },
      error: (err: any) => { this.isSaving.set(false); this.errorMessage.set(err.error?.message || 'Error al guardar la unidad administrativa.'); },
    });
  }

  async confirmDelete(unidad: UnidadAdministrativa) {
    if (!(await this.confirmation.confirm({ title: 'Eliminar unidad administrativa', message: `¿Eliminar la unidad ${unidad.nombreUnidadAdm}?`, confirmText: 'Eliminar', type: 'danger' }))) return;
    this.unidadService.delete(unidad.idUnidadAdm).subscribe({
      next: (res: any) => { if (res.success) { this.showSuccess('Unidad administrativa eliminada correctamente.'); this.loadUnidades(); } },
      error: () => { this.errorMessage.set('Error al eliminar la unidad.'); },
    });
  }

  private showSuccess(msg: string) { this.successMessage.set(msg); setTimeout(() => this.successMessage.set(null), 3000); }
}
