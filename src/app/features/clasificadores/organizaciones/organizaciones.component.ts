import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OrganizationService, Organization, OrganizationRequest } from '../../../core/services/organization.service';

@Component({
  selector: 'app-organizaciones',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './organizaciones.component.html',
})
export class OrganizacionesComponent implements OnInit {
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

  ngOnInit() {
    this.loadOrganizaciones();
  }

  getEmptyForm(): OrganizationRequest {
    return {
      nombre: '',
      cuit: '',
      abreviatura: '',
      activo: true
    };
  }

  loadOrganizaciones() {
    this.isLoading.set(true);
    this.orgService.getAll().subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.organizaciones.set(res.data);
        } else {
          this.organizaciones.set([]);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.organizaciones.set([]);
        this.errorMessage.set('Error al cargar las organizaciones.');
      }
    });
  }

  openCreateModal() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.form = this.getEmptyForm();
    this.isModalOpen.set(true);
  }

  openEditModal(org: Organization) {
    this.isEditing.set(true);
    this.editingId.set(org.idOrganizacion);
    this.form = {
      nombre: org.nombre,
      cuit: org.cuit,
      abreviatura: org.abreviatura,
      activo: org.activo !== undefined ? org.activo : true
    };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  save() {
    if (!this.form.nombre || !this.form.cuit) return;

    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null
      ? this.orgService.update(this.editingId()!, this.form)
      : this.orgService.create(this.form);

    obs.subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        if (res.success) {
          this.closeModal();
          this.showSuccess(this.isEditing() ? 'Organización actualizada correctamente.' : 'Organización creada correctamente.');
          this.loadOrganizaciones();
        }
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar la organización.');
      },
    });
  }

  confirmDelete(org: Organization) {
    if (!confirm(`¿Desactivar (baja lógica) la organización ${org.nombre}?`)) return;

    this.orgService.delete(org.idOrganizacion).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showSuccess('Organización desactivada correctamente.');
          this.loadOrganizaciones();
        }
      },
      error: () => {
        this.errorMessage.set('Error al desactivar la organización.');
      },
    });
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
