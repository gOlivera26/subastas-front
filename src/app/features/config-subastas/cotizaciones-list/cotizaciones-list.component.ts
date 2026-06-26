import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableColumn } from '../../../shared/ui/smart-table/table.models';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';

@Component({
  selector: 'app-cotizaciones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, SmartTableComponent, CustomSelect],
  templateUrl: './cotizaciones-list.component.html',
})
export class CotizacionesListComponent implements OnInit {
  private cotService = inject(CotizacionService);
  private vigService = inject(VigenciaService);

  vigencias = signal<Vigencia[]>([]);
  selectedVigenciaId = signal<number | null>(null);
  items = signal<SubastaDashboard[]>([]);
  loading = signal(true);

  estadoTpl = viewChild<TemplateRef<any>>('estadoTpl');
  accionesTpl = viewChild<TemplateRef<any>>('accionesTpl');

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const estado = this.estadoTpl();
    const acciones = this.accionesTpl();

    if (estado) templates['estado'] = estado;
    if (acciones) templates['acciones'] = acciones;

    return templates;
  });

  columns: TableColumn[] = [
    { key: 'nroCotizacion', header: 'Nro', sortable: true },
    { key: 'titulo', header: 'Subasta', sortable: true },
    { key: 'tipo', header: 'Tipo', sortable: true },
    { key: 'fechaInicio', header: 'Inicio', type: 'date', sortable: true },
    { key: 'estado', header: 'Estado', type: 'custom' },
    { key: 'acciones', header: 'Acciones', type: 'custom' },
  ];

  vigenciaOptions = computed<SelectOption[]>(() => this.vigencias().map(v => ({
    label: `Ejercicio ${v.ejercicio}${v.activoEjecucion ? ' (Activo)' : ''}`,
    value: v.idVigencia
  })));

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
