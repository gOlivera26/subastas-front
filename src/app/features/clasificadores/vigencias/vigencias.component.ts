import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { VigenciaService, VigenciaRequest } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';

@Component({
  selector: 'app-vigencias',
  standalone: true,
  imports: [DatePipe, FormsModule, LucideAngularModule, DataTableComponent, CellTemplateDirective],
  templateUrl: './vigencias.component.html',
})
export class VigenciasComponent implements OnInit {
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

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => { map[d.cellKey] = d.templateRef; });
    return map;
  });

  columns: TableColumn[] = [
    { key: 'ejercicio', label: 'Ejercicio' },
    { key: 'activoEjecucion', label: 'Activo' },
    { key: 'fecIng', label: 'Creado' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '120px' },
  ];

  ngOnInit() { this.loadVigencias(); }

  vigenciaOrdenada = computed(() => this.vigencias().sort((a, b) => b.ejercicio - a.ejercicio));

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

  confirmDelete(vigencia: Vigencia) {
    if (!confirm(`¿Eliminar la vigencia ${vigencia.ejercicio}?`)) return;
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
