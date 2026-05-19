import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProviderService, RubroTreeDto } from '../../../core/services/provider.service';

@Component({
  selector: 'app-rubros-tree',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
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

  openDetailModal(rubro: RubroTreeDto) {
    this.selectedRubro.set(rubro);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal() {
    this.isDetailModalOpen.set(false);
    this.selectedRubro.set(null);
  }

  trackByFn(index: number, item: RubroTreeDto): number {
    return item.id;
  }

  goToListView() {
    this.router.navigate(['/proveedores/rubros']);
  }
}
