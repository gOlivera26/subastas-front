import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { VigenciaService, VigenciaRequest } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableAction, TableColumn } from '../../../shared/ui/smart-table/table.models';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-vigencias',
  standalone: true,
  imports: [DatePipe, FormsModule, LucideAngularModule, SmartTableComponent],
  templateUrl: './vigencias.component.html',
})
export class VigenciasComponent implements OnInit {
  private confirmation = inject(ConfirmationService);
  private vigenciaService = inject(VigenciaService);

  vigencias = signal<Vigencia[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);

  form: VigenciaRequest = { ejercicio: new Date().getFullYear(), activoEjecucion: false };

  activoEjecucionTpl = viewChild<TemplateRef<any>>('activoEjecucionTpl');
  fecIngTpl = viewChild<TemplateRef<any>>('fecIngTpl');

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const activoEjecucion = this.activoEjecucionTpl();
    const fecIng = this.fecIngTpl();

    if (activoEjecucion) templates['activoEjecucion'] = activoEjecucion;
    if (fecIng) templates['fecIng'] = fecIng;

    return templates;
  });

  columns: TableColumn[] = [
    { key: 'ejercicio', header: 'Ejercicio', sortable: true },
    { key: 'activoEjecucion', header: 'Activo', type: 'custom' },
    { key: 'fecIng', header: 'Creado', type: 'custom', sortable: true },
  ];


  actions: TableAction[] = [
    { action: 'activate', icon: 'play', tooltip: 'Marcar como activa', color: 'text-emerald-400 hover:text-emerald-300', visible: (row: any) => !row.activoEjecucion },
    { action: 'edit', icon: 'pencil', tooltip: 'Editar vigencia', color: 'text-[var(--color-cyan-spark)] hover:text-[var(--color-cyan-spark)]' },
    { action: 'delete', icon: 'trash-2', tooltip: 'Eliminar vigencia', color: 'text-red-400 hover:text-red-300' },
  ];

  handleTableAction(event: { action: string; row: any }) {
    switch (event.action) {
      case 'activate':
        this.setActiva(event.row);
        break;
      case 'edit':
        this.openEditModal(event.row);
        break;
      case 'delete':
        this.confirmDelete(event.row);
        break;
    }
  }

  ngOnInit() { this.loadVigencias(); }

  vigenciaOrdenada = computed(() => [...this.vigencias()].sort((a, b) => b.ejercicio - a.ejercicio));

  loadVigencias() {
    this.isLoading.set(true);
    this.vigenciaService.getAll().subscribe({
      next: (res) => { this.isLoading.set(false); if (res.success && res.data) { this.vigencias.set(res.data); } },
      error: () => { this.isLoading.set(false); this.errorMessage.set('Error al cargar las vigencias.'); },
    });
  }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = { ejercicio: new Date().getFullYear(), activoEjecucion: false }; this.isModalOpen.set(true); }

  openEditModal(vigencia: Vigencia) { this.isEditing.set(true); this.editingId.set(vigencia.idVigencia); this.form = { ejercicio: vigencia.ejercicio, activoEjecucion: vigencia.activoEjecucion }; this.isModalOpen.set(true); }

  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.ejercicio) return;
    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null ? this.vigenciaService.update(this.editingId()!, this.form) : this.vigenciaService.create(this.form);
    obs.subscribe({
      next: (res) => { this.isSaving.set(false); if (res.success) { this.closeModal(); this.showSuccess(this.isEditing() ? 'Vigencia actualizada correctamente.' : 'Vigencia creada correctamente.'); this.loadVigencias(); } },
      error: () => { this.isSaving.set(false); this.errorMessage.set('Error al guardar la vigencia.'); },
    });
  }

  async confirmDelete(vigencia: Vigencia) {
    if (!(await this.confirmation.confirm({ title: 'Eliminar vigencia', message: `¿Eliminar la vigencia ${vigencia.ejercicio}?`, confirmText: 'Eliminar', type: 'danger' }))) return;
    this.vigenciaService.delete(vigencia.idVigencia).subscribe({
      next: (res) => { if (res.success) { this.showSuccess('Vigencia eliminada correctamente.'); this.loadVigencias(); } },
      error: () => { this.errorMessage.set('Error al eliminar la vigencia.'); },
    });
  }

  setActiva(vigencia: Vigencia) {
    this.vigenciaService.setActivaEjecucion(vigencia.idVigencia).subscribe({
      next: (res) => { if (res.success) { this.showSuccess(`Vigencia ${vigencia.ejercicio} marcada como activa.`); this.loadVigencias(); } },
      error: () => { this.errorMessage.set('Error al activar la vigencia.'); },
    });
  }

  private showSuccess(msg: string) { this.successMessage.set(msg); setTimeout(() => this.successMessage.set(null), 3000); }
}
