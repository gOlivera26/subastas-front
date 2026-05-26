import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { MonedaService, MonedaRequest } from '../../../core/services/moneda.service';
import { Moneda } from '../../../core/models/moneda.model';

@Component({
  selector: 'app-monedas', standalone: true,
  imports: [FormsModule, LucideAngularModule, DataTableComponent, CellTemplateDirective],
  templateUrl: './monedas.component.html',
})
export class MonedasComponent implements OnInit {
  private service = inject(MonedaService);
  items = signal<Moneda[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isModalOpen = signal(false); isEditing = signal(false); isSaving = signal(false); editingId = signal<number | null>(null);
  form: MonedaRequest = { simbolo: '', nombre: '', descripcion: '' };

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => { const m: Record<string, TemplateRef<any>> = {}; this.cellTemplateDirectives().forEach(d => m[d.cellKey] = d.templateRef); return m; });
  columns: TableColumn[] = [{ key: 'simbolo', label: 'Símbolo', width: '100px' }, { key: 'nombre', label: 'Nombre' }, { key: 'descripcion', label: 'Descripción' }, { key: 'activo', label: 'Estado', width: '100px' }, { key: 'acciones', label: 'Acciones', align: 'right', width: '100px' }];

  ngOnInit() { this.loadItems(); }

  loadItems() { this.isLoading.set(true); this.service.getAll().subscribe({ next: (res: any) => { this.isLoading.set(false); if (res.success && res.data) this.items.set(res.data); else this.items.set([]); }, error: () => { this.isLoading.set(false); this.items.set([]); } }); }

  openCreateModal() { this.isEditing.set(false); this.editingId.set(null); this.form = { simbolo: '', nombre: '', descripcion: '' }; this.isModalOpen.set(true); }
  openEditModal(item: Moneda) { this.isEditing.set(true); this.editingId.set(item.idMoneda); this.form = { simbolo: item.simbolo, nombre: item.nombre, descripcion: item.descripcion }; this.isModalOpen.set(true); }
  closeModal() { this.isModalOpen.set(false); }

  save() { if (!this.form.nombre || !this.form.simbolo) return; this.isSaving.set(true); const o = this.isEditing() && this.editingId() != null ? this.service.update(this.editingId()!, this.form) : this.service.create(this.form); o.subscribe({ next: (res: any) => { this.isSaving.set(false); if (res.success) { this.closeModal(); this.showSuccess('Guardado.'); this.loadItems(); } }, error: (e: any) => { this.isSaving.set(false); this.errorMessage.set(e.error?.message || 'Error.'); } }); }

  confirmDelete(item: Moneda) { if (!confirm(`¿Eliminar "${item.nombre}"?`)) return; this.service.delete(item.idMoneda).subscribe({ next: (res: any) => { if (res.success) { this.showSuccess('Eliminado.'); this.loadItems(); } }, error: () => this.errorMessage.set('Error.') }); }

  private showSuccess(m: string) { this.successMessage.set(m); setTimeout(() => this.successMessage.set(null), 3000); }
}
