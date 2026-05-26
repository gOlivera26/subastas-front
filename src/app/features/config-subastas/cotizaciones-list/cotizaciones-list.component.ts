import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';

@Component({
  selector: 'app-cotizaciones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, DataTableComponent, CellTemplateDirective],
  templateUrl: './cotizaciones-list.component.html',
})
export class CotizacionesListComponent implements OnInit {
  private cotService = inject(CotizacionService);
  private vigService = inject(VigenciaService);

  vigencias = signal<Vigencia[]>([]);
  selectedVigenciaId = signal<number | null>(null);
  items = signal<SubastaDashboard[]>([]);
  loading = signal(true);

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => { const m: Record<string, TemplateRef<any>> = {}; this.cellTemplateDirectives().forEach(d => m[d.cellKey] = d.templateRef); return m; });

  columns: TableColumn[] = [
    { key: 'nroCotizacion', label: 'Nro', width: '140px' },
    { key: 'titulo', label: 'Subasta' },
    { key: 'tipo', label: 'Tipo', width: '140px' },
    { key: 'fechaInicio', label: 'Inicio', width: '120px' },
    { key: 'estado', label: 'Estado', width: '100px' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '100px' },
  ];

  ngOnInit() { this.loadVigencias(); }

  loadVigencias() {
    this.vigService.getAll().subscribe({ next: (r: any) => { if (r?.success && r.data) { const s = r.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio); this.vigencias.set(s); const a = s.find((v: any) => v.activoEjecucion); this.selectedVigenciaId.set(a?.idVigencia || s[0]?.idVigencia || null); this.loadItems(); } } });
  }

  loadItems() {
    this.loading.set(true);
    this.cotService.getDelMes(this.selectedVigenciaId() ?? undefined).subscribe({
      next: (r: any) => { this.loading.set(false); if (r?.success) this.items.set(r.data || []); },
      error: () => this.loading.set(false)
    });
  }

  onVigenciaChange(v: any) { this.selectedVigenciaId.set(+v); this.loadItems(); }
}
