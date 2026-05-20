import { Component, OnInit, signal, inject, computed, TemplateRef, viewChildren, Directive, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProviderService, RubroListDto, CreateRubroDto, UpdateRubroDto } from '../../../core/services/provider.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';

@Directive({
  selector: 'ng-template[cellKey]',
  standalone: true,
})
export class CellTemplateDirective {
  @Input({ required: true }) cellKey!: string;
  constructor(public templateRef: TemplateRef<any>) {}
}

@Component({
  selector: 'app-rubros-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, SearchableSelectComponent, DataTableComponent, CellTemplateDirective],
  templateUrl: './rubros-list.component.html',
})
export class RubrosListComponent implements OnInit {
  private providerService = inject(ProviderService);
  private router = inject(Router);

  rubros = signal<RubroListDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(20);
  totalRows = signal(0);
  searchTerm = signal('');

  isCreateModalOpen = signal(false);
  isEditModalOpen = signal(false);

  selectedRubro = signal<RubroListDto | null>(null);

  createForm = {
    codigo: '',
    descripcion: '',
    idRubroPadre: null as number | null,
    imputable: false,
  };

  editForm = {
    id: 0,
    codigo: '',
    descripcion: '',
    idRubroPadre: null as number | null,
    imputable: false,
  };

  allRubrosForSelect = signal<{ id: number; codigo: string; descripcion: string }[]>([]);

  rubroOptions = computed<SelectOption[]>(() =>
    this.allRubrosForSelect().map(r => ({
      value: r.id,
      label: `${r.codigo} — ${r.descripcion}`
    }))
  );

  columns: TableColumn[] = [
    { key: 'codigo', label: 'Código', sortable: true, width: '100px' },
    { key: 'descripcion', label: 'Descripción', sortable: true },
    { key: 'rubroPadre', label: 'Rubro Padre' },
    { key: 'imputable', label: 'Imputable', align: 'center', width: '100px' },
    { key: 'activo', label: 'Estado', align: 'center', width: '100px' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '120px' },
  ];

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => {
      map[d.cellKey] = d.templateRef;
    });
    return map;
  });

  ngOnInit() {
    this.loadRubros();
  }

  sortKey = signal<string>('codigo');
  sortDirection = signal<'asc' | 'desc'>('asc');

  onSort(event: { key: string; direction: 'asc' | 'desc' }) {
    this.sortKey.set(event.key);
    this.sortDirection.set(event.direction);
    this.currentPage.set(1);
    this.loadRubros();
  }

  onPageChange(event: { page: number; pageSize: number }) {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadRubros();
  }

  loadRubros() {
    this.loading.set(true);
    this.providerService.getRubros(this.currentPage(), this.pageSize(), this.searchTerm() || undefined, this.sortKey(), this.sortDirection())
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.rubros.set(res.data.data || []);
            this.totalRows.set(res.data.total || 0);
          } else {
            this.rubros.set([]);
            this.totalRows.set(0);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar rubros');
          this.loading.set(false);
        }
      });
  }

  search() {
    this.currentPage.set(1);
    this.loadRubros();
  }

  nextPage() {
    if ((this.currentPage() * this.pageSize()) < this.totalRows()) {
      this.currentPage.update(p => p + 1);
      this.loadRubros();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadRubros();
    }
  }

  openCreateModal() {
    this.createForm = { codigo: '', descripcion: '', idRubroPadre: null, imputable: false };
    this.loadAllRubrosForSelect();
    this.isCreateModalOpen.set(true);
  }

  openEditModal(rubro: RubroListDto) {
    this.editForm = {
      id: rubro.id,
      codigo: rubro.codigo,
      descripcion: rubro.descripcion,
      idRubroPadre: rubro.idRubroPadre,
      imputable: rubro.imputable,
    };
    this.loadAllRubrosForSelect();
    this.isEditModalOpen.set(true);
  }

  loadAllRubrosForSelect() {
    this.providerService.getRubros(1, 500).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allRubrosForSelect.set(res.data.data.map(r => ({ id: r.id, codigo: r.codigo, descripcion: r.descripcion })));
        }
      }
    });
  }

  createRubro() {
    if (!this.createForm.codigo || !this.createForm.descripcion) {
      this.error.set('Complete los campos obligatorios');
      return;
    }
    this.providerService.createRubro(this.createForm as CreateRubroDto).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Rubro creado exitosamente');
          this.isCreateModalOpen.set(false);
          this.loadRubros();
        } else {
          this.error.set(res.message);
        }
      },
      error: () => {
        this.error.set('Error al crear rubro');
      }
    });
  }

  updateRubro() {
    if (!this.editForm.codigo || !this.editForm.descripcion) {
      this.error.set('Complete los campos obligatorios');
      return;
    }
    this.providerService.updateRubro(this.editForm as UpdateRubroDto).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Rubro actualizado exitosamente');
          this.isEditModalOpen.set(false);
          this.loadRubros();
        } else {
          this.error.set(res.message);
        }
      },
      error: () => {
        this.error.set('Error al actualizar rubro');
      }
    });
  }

  deleteRubro(id: number) {
    this.providerService.deleteRubro(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Rubro eliminado');
          this.loadRubros();
        } else {
          this.error.set(res.message);
        }
      },
      error: () => {
        this.error.set('Error al eliminar rubro');
      }
    });
  }

  closeModal() {
    this.isCreateModalOpen.set(false);
    this.isEditModalOpen.set(false);
    this.error.set(null);
    this.success.set(null);
  }

  clearMessages() {
    this.error.set(null);
    this.success.set(null);
  }

  goToTreeView() {
    this.router.navigate(['/proveedores/rubros/arbol']);
  }

  totalPages(): number {
    return Math.ceil(this.totalRows() / this.pageSize()) || 1;
  }
}
