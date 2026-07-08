import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OrganizationService, Organization, OrganizationRequest } from '../../../core/services/organization.service';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableAction, TableColumn } from '../../../shared/ui/smart-table/table.models';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-organizaciones',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, SmartTableComponent],
  templateUrl: './organizaciones.component.html',
})
export class OrganizacionesComponent implements OnInit {
  private confirmation = inject(ConfirmationService);
  private orgService = inject(OrganizationService);

  organizaciones = signal<Organization[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);

  form: OrganizationRequest = this.getEmptyForm();

  activoTpl = viewChild<TemplateRef<any>>('activoTpl');

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const activo = this.activoTpl();

    if (activo) templates['activo'] = activo;

    return templates;
  });

  columns: TableColumn[] = [
    { key: 'nombre', header: 'Nombre', sortable: true },
    { key: 'cuit', header: 'CUIT', sortable: true },
    { key: 'abreviatura', header: 'Abreviatura', sortable: true },
    { key: 'activo', header: 'Estado', type: 'custom' },
  ];


  actions: TableAction[] = [
    { action: 'edit', icon: 'pencil', tooltip: 'Editar organización', color: 'text-[var(--color-cyan-spark)] hover:text-[var(--color-cyan-spark)]' },
    { action: 'delete', icon: 'trash-2', tooltip: 'Desactivar organización', color: 'text-red-400 hover:text-red-300', visible: (row: any) => !!row.activo },
  ];

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

  ngOnInit() { this.loadOrganizaciones(); }

  getEmptyForm(): OrganizationRequest { return { nombre: '', cuit: '', abreviatura: '', activo: true }; }

  loadOrganizaciones() {
    this.isLoading.set(true);
    this.orgService.getAll().subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success && res.data) { this.organizaciones.set(res.data); }
        else { this.organizaciones.set([]); }
      },
      error: () => { this.isLoading.set(false); this.organizaciones.set([]); this.errorMessage.set('Error al cargar las organizaciones.'); }
    });
  }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = this.getEmptyForm(); this.isModalOpen.set(true); }

  openEditModal(org: Organization) {
    this.isEditing.set(true); this.editingId.set(org.idOrganizacion);
    this.form = { nombre: org.nombre, cuit: org.cuit, abreviatura: org.abreviatura, activo: org.activo !== undefined ? org.activo : true };
    this.isModalOpen.set(true);
  }

  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.nombre || !this.form.cuit) return;
    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null
      ? this.orgService.update(this.editingId()!, this.form)
      : this.orgService.create(this.form);
    obs.subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        if (res.success) { this.closeModal(); this.showSuccess(this.isEditing() ? 'Organización actualizada correctamente.' : 'Organización creada correctamente.'); this.loadOrganizaciones(); }
      },
      error: (err: any) => { this.isSaving.set(false); this.errorMessage.set(err.error?.message || 'Error al guardar la organización.'); },
    });
  }

  async confirmDelete(org: Organization) {
    if (!(await this.confirmation.confirm({ title: 'Desactivar organización', message: `¿Desactivar (baja lógica) la organización ${org.nombre}?`, confirmText: 'Desactivar', type: 'warning' }))) return;
    this.orgService.delete(org.idOrganizacion).subscribe({
      next: (res: any) => { if (res.success) { this.showSuccess('Organización desactivada correctamente.'); this.loadOrganizaciones(); } },
      error: () => { this.errorMessage.set('Error al desactivar la organización.'); },
    });
  }

  private showSuccess(msg: string) { this.successMessage.set(msg); setTimeout(() => this.successMessage.set(null), 3000); }
}
