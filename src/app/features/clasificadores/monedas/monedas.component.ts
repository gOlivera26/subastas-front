import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MonedaService, MonedaRequest } from '../../../core/services/moneda.service';
import { Moneda } from '../../../core/models/moneda.model';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableColumn } from '../../../shared/ui/smart-table/table.models';

@Component({
  selector: 'app-monedas',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, SmartTableComponent],
  templateUrl: './monedas.component.html',
})
export class MonedasComponent implements OnInit {
  private service = inject(MonedaService);
  items = signal<Moneda[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);
  form: MonedaRequest = { simbolo: '', nombre: '', descripcion: '' };

  activoTpl = viewChild<TemplateRef<any>>('activoTpl');
  accionesTpl = viewChild<TemplateRef<any>>('accionesTpl');

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const activo = this.activoTpl();
    const acciones = this.accionesTpl();

    if (activo) templates['activo'] = activo;
    if (acciones) templates['acciones'] = acciones;

    return templates;
  });

  columns: TableColumn[] = [
    { key: 'simbolo', header: 'Símbolo', sortable: true },
    { key: 'nombre', header: 'Nombre', sortable: true },
    { key: 'descripcion', header: 'Descripción' },
    { key: 'activo', header: 'Estado', type: 'custom' },
    { key: 'acciones', header: 'Acciones', type: 'custom' }
  ];

  ngOnInit() { this.loadItems(); }

  loadItems() {
    this.isLoading.set(true);
    this.service.getAll().subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success && res.data) this.items.set(res.data);
        else this.items.set([]);
      },
      error: () => {
        this.isLoading.set(false);
        this.items.set([]);
      }
    });
  }

  openCreateModal() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.form = { simbolo: '', nombre: '', descripcion: '' };
    this.isModalOpen.set(true);
  }

  openEditModal(item: Moneda) {
    this.isEditing.set(true);
    this.editingId.set(item.idMoneda);
    this.form = { simbolo: item.simbolo, nombre: item.nombre, descripcion: item.descripcion };
    this.isModalOpen.set(true);
  }

  closeModal() { this.isModalOpen.set(false); }

  save() {
    if (!this.form.nombre || !this.form.simbolo) return;
    this.isSaving.set(true);
    const request = this.isEditing() && this.editingId() != null
      ? this.service.update(this.editingId()!, this.form)
      : this.service.create(this.form);

    request.subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        if (res.success) {
          this.closeModal();
          this.showSuccess('Guardado.');
          this.loadItems();
        }
      },
      error: (e: any) => {
        this.isSaving.set(false);
        this.errorMessage.set(e.error?.message || 'Error.');
      }
    });
  }

  confirmDelete(item: Moneda) {
    if (!confirm('¿Eliminar "' + item.nombre + '"?')) return;
    this.service.delete(item.idMoneda).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showSuccess('Eliminado.');
          this.loadItems();
        }
      },
      error: () => this.errorMessage.set('Error.')
    });
  }

  private showSuccess(m: string) {
    this.successMessage.set(m);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
