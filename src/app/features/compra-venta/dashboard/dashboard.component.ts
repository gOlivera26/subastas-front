import { Component, OnInit, OnDestroy, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { TimeService } from '../../../core/services/time.service';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableColumn } from '../../../shared/ui/smart-table/table.models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-compra-venta',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule, CustomSelect, SmartTableComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardCompraVentaComponent implements OnInit, OnDestroy {
  private vigenciaService = inject(VigenciaService);
  private cotizacionService = inject(CotizacionService);
  private timeService = inject(TimeService);
  protected auth = inject(AuthService);
  
  private timerInterval: any;
  tick = signal(0);

  vigencias = signal<Vigencia[]>([]);
  selectedVigenciaId = signal<number | null>(null);
  fechaInicio = signal<string>(new Date().toISOString().split('T')[0]);
  fechaFin = signal<string>('');

  enCurso = signal<SubastaDashboard[]>([]);
  proximas = signal<SubastaDashboard[]>([]);
  delMes = signal<SubastaDashboard[]>([]);
  loading = signal(false);

  vigenciaOptions = computed<SelectOption[]>(() => this.vigencias().map(v => ({
    label: `Ejercicio ${v.ejercicio}${v.activoEjecucion ? ' (Activo)' : ''}`,
    value: v.idVigencia
  })));

  estadoTpl = viewChild<TemplateRef<any>>('estadoTpl');
  accionTpl = viewChild<TemplateRef<any>>('accionTpl');

  calendarioTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const estado = this.estadoTpl();
    const accion = this.accionTpl();

    if (estado) templates['estado'] = estado;
    if (accion) templates['accion'] = accion;

    return templates;
  });

  calendarioColumns: TableColumn[] = [
    { key: 'nroCotizacion', header: 'Nro', sortable: true },
    { key: 'titulo', header: 'Subasta', sortable: true },
    { key: 'tipo', header: 'Tipo', sortable: true },
    { key: 'fechaInicio', header: 'Fecha', type: 'date', sortable: true },
    { key: 'estado', header: 'Estado', type: 'custom' },
    { key: 'accion', header: 'AcciÃ³n', type: 'custom' },
  ];

  ngOnInit() {
    this.timeService.syncWithServer();
    this.timerInterval = setInterval(() => this.tick.update(v => v + 1), 1000);
    this.fechaFin.set(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]);
    this.loadVigencias();
  }

  loadVigencias() {
    this.vigenciaService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const s = res.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigencias.set(s);
          const a = s.find((v: any) => v.activoEjecucion);
          if (a) this.selectedVigenciaId.set(a.idVigencia);
          else if (s.length) this.selectedVigenciaId.set(s[0].idVigencia);
          this.loadDashboard();
        }
      }
    });
  }

  loadDashboard() {
    const id = this.selectedVigenciaId() ?? undefined;
    this.loading.set(true);

    this.cotizacionService.getEnCurso(id).subscribe({
      next: (r: any) => { if (r?.success) this.enCurso.set(r.data || []); }
    });
    this.cotizacionService.getProximas(id).subscribe({
      next: (r: any) => { if (r?.success) this.proximas.set(r.data || []); }
    });
    this.cotizacionService.getDelMes(id).subscribe({
      next: (r: any) => { if (r?.success) { this.delMes.set(r.data || []); this.loading.set(false); } },
      error: () => this.loading.set(false)
    });
  }

  getTimeLeft(endDate?: string): string {
    if (!endDate) return '--:--:--';
    const diff = new Date(endDate).getTime() - this.timeService.now();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  getDaysLeft(startDate?: string): string {
    if (!startDate) return '';
    const diff = new Date(startDate).getTime() - this.timeService.now();
    if (diff <= 0) return 'Hoy';
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days === 1) return 'MaÃ±ana';
    return `En ${days} dÃ­as`;
  }

  onVigenciaChange(val: any) { this.selectedVigenciaId.set(+val); this.loadDashboard(); }

  ngOnDestroy() { if (this.timerInterval) clearInterval(this.timerInterval); }
}
