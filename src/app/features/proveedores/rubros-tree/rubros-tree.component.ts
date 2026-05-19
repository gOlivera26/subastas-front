import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProviderService, RubroTreeDto } from '../../../core/services/provider.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-rubros-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, LoadingSpinnerComponent],
  templateUrl: './rubros-tree.component.html',
})
export class RubrosTreeComponent implements OnInit {
  private providerService = inject(ProviderService);
  private router = inject(Router);

  rubrosTree = signal<RubroTreeDto[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  expandedNodes = signal<Set<number>>(new Set());
  searchTerm = signal('');

  sortKey = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc' | null>(null);

  filteredTree = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.rubrosTree();
    return this.filterNodes(this.rubrosTree(), term);
  });

  sortedTree = computed(() => {
    const tree = this.filteredTree();
    const key = this.sortKey();
    const dir = this.sortDirection();
    if (!key || !dir) return tree;
    return this.sortTree([...tree], key, dir);
  });

  isEditModalOpen = signal(false);
  editForm = { id: 0, codigo: '', descripcion: '', imputable: true, idRubroPadre: null as number | null };

  isDeleteModalOpen = signal(false);
  deleteTargetId = signal<number | null>(null);

  isDetailModalOpen = signal(false);
  selectedRubro = signal<RubroTreeDto | null>(null);

  ngOnInit() {
    this.loadTree();
  }

  loadTree() {
    this.loading.set(true);
    this.providerService.getRubroTree().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.rubrosTree.set(res.data);
        } else {
          this.error.set('No se encontraron rubros');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el árbol de rubros');
        this.loading.set(false);
      }
    });
  }

  filterNodes(nodes: RubroTreeDto[], term: string): RubroTreeDto[] {
    return nodes
      .map(node => {
        const matches = node.codigo.toLowerCase().includes(term) ||
                        node.descripcion.toLowerCase().includes(term);
        const filteredChildren = this.filterNodes(node.children, term);
        if (matches || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      })
      .filter((n): n is RubroTreeDto => n !== null);
  }

  sortTree(nodes: RubroTreeDto[], key: string, dir: 'asc' | 'desc'): RubroTreeDto[] {
    const sorted = nodes.sort((a, b) => {
      let valA: string | boolean = '';
      let valB: string | boolean = '';
      if (key === 'descripcion') { valA = a.descripcion; valB = b.descripcion; }
      else if (key === 'codigo') { valA = a.codigo; valB = b.codigo; }
      else if (key === 'imputable') { valA = a.imputable; valB = b.imputable; }
      if (typeof valA === 'boolean') {
        return dir === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
      }
      return dir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return sorted.map(n => ({ ...n, children: this.sortTree([...n.children], key, dir) }));
  }

  filterTree() {}

  onSort(key: string) {
    if (this.sortKey() === key) {
      const newDir = this.sortDirection() === 'asc' ? 'desc' : 'asc';
      this.sortDirection.set(newDir);
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  getSortIcon(key: string): string {
    if (this.sortKey() !== key) return 'chevrons-up-down';
    return this.sortDirection() === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  getSortIconClass(key: string): string {
    if (this.sortKey() !== key) return 'text-[var(--color-storm-cloud)]';
    return 'text-[var(--color-cyan-spark)]';
  }

  toggleNode(rubroId: number, event: Event) {
    event.stopPropagation();
    const expanded = new Set(this.expandedNodes());
    if (expanded.has(rubroId)) {
      expanded.delete(rubroId);
    } else {
      expanded.add(rubroId);
    }
    this.expandedNodes.set(expanded);
  }

  isExpanded(rubroId: number): boolean {
    return this.expandedNodes().has(rubroId);
  }

  openEditModal(rubro: RubroTreeDto) {
    this.editForm = {
      id: rubro.id,
      codigo: rubro.codigo,
      descripcion: rubro.descripcion,
      imputable: rubro.imputable,
      idRubroPadre: rubro.idRubroPadre,
    };
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
  }

  updateRubro() {
    this.providerService.updateRubro({
      id: this.editForm.id,
      codigo: this.editForm.codigo,
      descripcion: this.editForm.descripcion,
      imputable: this.editForm.imputable,
      idRubroPadre: this.editForm.idRubroPadre,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Rubro actualizado correctamente');
          this.closeEditModal();
          this.loadTree();
          setTimeout(() => this.success.set(null), 3000);
        } else {
          this.error.set(res.message || 'Error al actualizar');
        }
      },
      error: () => this.error.set('Error al actualizar el rubro'),
    });
  }

  openDeleteModal(id: number) {
    this.deleteTargetId.set(id);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.deleteTargetId.set(null);
  }

  confirmDelete() {
    const id = this.deleteTargetId();
    if (!id) return;
    this.providerService.deleteRubro(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Rubro eliminado correctamente');
          this.loadTree();
          setTimeout(() => this.success.set(null), 3000);
        } else {
          this.error.set(res.message || 'Error al eliminar');
        }
      },
      error: () => this.error.set('Error al eliminar el rubro'),
    });
    this.closeDeleteModal();
  }

  deleteRubro(id: number) {
    this.openDeleteModal(id);
  }

  trackByFn(index: number, item: RubroTreeDto): number {
    return item.id;
  }

  goToListView() {
    this.router.navigate(['/proveedores/rubros']);
  }

  openDetailModal(rubro: RubroTreeDto) {
    this.selectedRubro.set(rubro);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal() {
    this.isDetailModalOpen.set(false);
    this.selectedRubro.set(null);
  }
}
