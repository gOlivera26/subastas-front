import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UnidadAdministrativaService, UnidadAdministrativaRequest } from '../../../core/services/unidad-administrativa.service';
import { UnidadAdministrativa } from '../../../core/models/unidad-administrativa.model';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { OrganizationService, Organization } from '../../../core/services/organization.service';

@Component({
  selector: 'app-unidades-administrativas',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './unidades-administrativas.component.html',
})
export class UnidadesAdministrativasComponent implements OnInit {
  private unidadService = inject(UnidadAdministrativaService);
  private vigenciaService = inject(VigenciaService);
  private orgService = inject(OrganizationService);

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
  editingId = signal<number | null>(null);

  // Form initialization
  form: UnidadAdministrativaRequest = this.getEmptyForm();

  ngOnInit() {
    this.loadVigencias();
    this.loadOrganizaciones();
  }

  loadOrganizaciones() {
    this.orgService.getActiveOrganizations().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.organizaciones.set(res.data);
        }
      }
    });
  }

  getEmptyForm(): UnidadAdministrativaRequest {
    return {
      numeroUnidadAdm: 0,
      nombreUnidadAdm: '',
      idVigencia: this.selectedVigenciaId() || 0,
      idOrganizacion: undefined,
      nroServicioAdm: undefined,
      idProveedor: undefined,
      mail: '',
      alias: '',
      puerto: undefined,
      smtp: ''
    };
  }

  loadVigencias() {
    this.isLoading.set(true);
    this.vigenciaService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const sorted = res.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigencias.set(sorted);
          
          // Seleccionar la vigencia activa por defecto, o la primera si no hay activa
          const activa = sorted.find((v: any) => v.activoEjecucion);
          if (activa) {
            this.selectedVigenciaId.set(activa.idVigencia);
          } else if (sorted.length > 0) {
            this.selectedVigenciaId.set(sorted[0].idVigencia);
          }

          if (this.selectedVigenciaId()) {
            this.loadUnidades();
          } else {
            this.isLoading.set(false);
          }
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al cargar las vigencias.');
      }
    });
  }

  onVigenciaChange(event: any) {
    const id = Number(event.target.value);
    this.selectedVigenciaId.set(id);
    this.loadUnidades();
  }

  loadUnidades() {
    const vigenciaId = this.selectedVigenciaId();
    if (!vigenciaId) return;

    this.isLoading.set(true);
    this.unidadService.getByVigencia(vigenciaId).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.unidades.set(res.data);
        } else {
          this.unidades.set([]);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.unidades.set([]);
        this.errorMessage.set('Error al cargar las unidades administrativas.');
      }
    });
  }

  openCreateModal() {
    if (!this.selectedVigenciaId()) {
      this.errorMessage.set('Debe haber una vigencia seleccionada para crear una unidad.');
      setTimeout(() => this.errorMessage.set(null), 3000);
      return;
    }

    this.isEditing.set(false);
    this.editingId.set(null);
    this.form = this.getEmptyForm();
    this.isModalOpen.set(true);
  }

  openEditModal(unidad: UnidadAdministrativa) {
    this.isEditing.set(true);
    this.editingId.set(unidad.idUnidadAdm);
    this.form = {
      numeroUnidadAdm: unidad.numeroUnidadAdm,
      nombreUnidadAdm: unidad.nombreUnidadAdm,
      idVigencia: unidad.idVigencia,
      idOrganizacion: unidad.idOrganizacion,
      nroServicioAdm: unidad.nroServicioAdm,
      idProveedor: unidad.idProveedor,
      mail: unidad.mail || '',
      alias: unidad.alias || '',
      puerto: unidad.puerto,
      smtp: unidad.smtp || ''
    };
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  save() {
    if (!this.form.nombreUnidadAdm || !this.form.numeroUnidadAdm) return;

    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null
      ? this.unidadService.update(this.editingId()!, this.form)
      : this.unidadService.create(this.form);

    obs.subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        if (res.success) {
          this.closeModal();
          this.showSuccess(this.isEditing() ? 'Unidad actualizada correctamente.' : 'Unidad creada correctamente.');
          this.loadUnidades();
        }
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar la unidad administrativa.');
      },
    });
  }

  confirmDelete(unidad: UnidadAdministrativa) {
    if (!confirm(`¿Eliminar la unidad ${unidad.nombreUnidadAdm}?`)) return;

    this.unidadService.delete(unidad.idUnidadAdm).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showSuccess('Unidad administrativa eliminada correctamente.');
          this.loadUnidades();
        }
      },
      error: () => {
        this.errorMessage.set('Error al eliminar la unidad.');
      },
    });
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
