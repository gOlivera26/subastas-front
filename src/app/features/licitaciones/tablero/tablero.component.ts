import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexYAxis,
  ApexFill,
  ApexTooltip,
  ApexTheme,
  ApexPlotOptions,
  ApexLegend,
  ApexGrid,
} from 'ng-apexcharts';

import { environment } from '../../../../environments/environment';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';
import { PivotTableComponent } from '../../../shared/ui/pivot-table/pivot-table.component';

interface TableroItem {
  idCotizacion: number;
  cotizacion: string;
  idProveedor: number;
  proveedor: string;
  idCotizacionDetalle?: number;
  idRenglon?: number;
  item: string;
  presupuestado: number;
  subastado: number;
  ahorrado: number;
  porcentajeAhorro: number;
}

interface TableroData {
  idVigencia?: number;
  ejercicio?: number;
  criterioAdjudicacion: number;
  criterio: string;
  totalPresupuestado: number;
  totalSubastado: number;
  totalAhorrado: number;
  porcentajeAhorro: number;
  cantidadCotizaciones: number;
  cantidadFilas: number;
  items: TableroItem[];
}

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  yaxis: ApexYAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
  theme: ApexTheme;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  grid: ApexGrid;
  colors: string[];
};

@Component({
  selector: 'app-tablero',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    CustomSelect,
    NgApexchartsModule,
    PivotTableComponent,
  ],
  templateUrl: './tablero.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .tablero-shell {
      display: flex;
      width: 100%;
      min-width: 0;
      flex-direction: column;
      gap: 18px;
    }

    .tablero-hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--color-charcoal-grey) 86%, white 14%);
      border-radius: 18px;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.032), rgba(255, 255, 255, 0.008)),
        var(--color-graphite);
      padding: 20px;
      box-shadow:
        0 12px 34px rgba(0, 0, 0, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.035);
    }

    .hero-copy {
      min-width: 0;
    }

    .hero-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--color-storm-cloud);
      font-size: 10px;
      font-weight: 590;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--color-cyan-spark);
    }

    .tablero-hero h1 {
      margin: 0;
      color: var(--color-porcelain);
      font-size: 28px;
      font-weight: 590;
      line-height: 1.05;
      letter-spacing: -0.04em;
    }

    .tablero-hero p {
      max-width: 680px;
      margin: 8px 0 0;
      color: var(--color-storm-cloud);
      font-size: 12px;
      line-height: 1.55;
    }

    .hero-actions {
      display: flex;
      flex: none;
      align-items: center;
      gap: 10px;
    }

    .state-card,
    .error-card {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 220px;
      border: 1px solid var(--color-charcoal-grey);
      border-radius: 18px;
      background: var(--color-graphite);
      color: var(--color-storm-cloud);
      font-size: 13px;
    }

    .state-card {
      flex-direction: column;
      gap: 12px;
    }

    .loader {
      width: 28px;
      height: 28px;
      border: 2px solid color-mix(in srgb, var(--color-cyan-spark) 35%, transparent);
      border-top-color: var(--color-cyan-spark);
      border-radius: 999px;
      animation: spin 750ms linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error-card {
      align-items: flex-start;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      border-color: rgba(248, 113, 113, 0.34);
      background: rgba(248, 113, 113, 0.08);
      padding: 18px 20px;
      color: #fca5a5;
    }

    .error-card strong {
      color: #fecaca;
      font-size: 13px;
      font-weight: 590;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .summary-card {
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--color-charcoal-grey) 86%, white 14%);
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.008)),
        var(--color-graphite);
      padding: 17px 18px;
      box-shadow:
        0 10px 26px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .summary-card-accent {
      background:
        linear-gradient(180deg, rgba(2, 184, 204, 0.045), rgba(2, 184, 204, 0.008)),
        var(--color-graphite);
    }

    .summary-card-positive {
      background:
        linear-gradient(180deg, rgba(228, 242, 34, 0.035), rgba(228, 242, 34, 0.006)),
        var(--color-graphite);
    }

    .summary-card-neutral {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.022), rgba(255, 255, 255, 0.006)),
        var(--color-graphite);
    }

    .summary-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--color-storm-cloud);
      font-size: 10px;
      font-weight: 590;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .summary-dot {
      width: 7px;
      height: 7px;
      flex: none;
      border-radius: 999px;
    }

    .dot-muted {
      background: var(--color-storm-cloud);
    }

    .dot-cyan {
      background: var(--color-cyan-spark);
    }

    .dot-lime {
      background: var(--color-neon-lime);
    }

    .summary-card strong {
      display: block;
      margin-top: 12px;
      color: var(--color-porcelain);
      font-size: 25px;
      font-weight: 590;
      line-height: 1;
      letter-spacing: -0.04em;
    }

    .summary-card-accent strong {
      color: var(--color-cyan-spark);
    }

    .summary-card-positive strong,
    .summary-card-neutral strong {
      color: var(--color-neon-lime);
    }

    .summary-card small {
      display: block;
      margin-top: 8px;
      color: var(--color-fog-grey);
      font-size: 11px;
      line-height: 1.35;
    }

    .insight-card {
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--color-charcoal-grey) 86%, white 14%);
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.024), rgba(255, 255, 255, 0.006)),
        var(--color-graphite);
      box-shadow:
        0 12px 34px rgba(0, 0, 0, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .section-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid color-mix(in srgb, var(--color-charcoal-grey) 78%, transparent);
      padding: 16px 18px 12px;
    }

    .section-head h2 {
      margin: 0;
      color: var(--color-porcelain);
      font-size: 16px;
      font-weight: 590;
      letter-spacing: -0.015em;
    }

    .section-head p {
      margin: 5px 0 0;
      color: var(--color-storm-cloud);
      font-size: 11px;
      line-height: 1.45;
    }

    .section-meta {
      flex: none;
      border: 1px solid var(--color-charcoal-grey);
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.16);
      padding: 5px 9px;
      color: var(--color-fog-grey);
      font-size: 10px;
      font-weight: 510;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .chart-wrap {
      min-height: 260px;
      padding: 12px 16px 8px;
    }

    .empty-chart {
      display: grid;
      min-height: 220px;
      place-items: center;
      color: var(--color-fog-grey);
      font-size: 12px;
    }

    .context-strip {
      display: flex;
      align-items: center;
      gap: 14px;
      border: 1px solid color-mix(in srgb, var(--color-charcoal-grey) 78%, transparent);
      border-radius: 16px;
      background: rgba(0, 0, 0, 0.12);
      padding: 12px 14px;
    }

    .context-item {
      display: flex;
      align-items: baseline;
      gap: 7px;
      min-width: 0;
    }

    .context-grow {
      flex: 1;
      justify-content: flex-end;
    }

    .context-value {
      color: var(--color-porcelain);
      font-size: 14px;
      font-weight: 590;
      line-height: 1;
    }

    .context-label {
      color: var(--color-fog-grey);
      font-size: 11px;
      font-weight: 510;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .context-chip {
      overflow: hidden;
      max-width: 260px;
      border: 1px solid var(--color-charcoal-grey);
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-deep-slate) 72%, var(--color-graphite) 28%);
      padding: 4px 9px;
      color: var(--color-porcelain);
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 510;
    }

    .context-separator {
      width: 1px;
      height: 18px;
      background: var(--color-charcoal-grey);
    }

    :host-context(.dark) .tablero-hero,
    :host-context(.dark) .summary-card,
    :host-context(.dark) .insight-card {
      border-color: color-mix(in srgb, var(--color-charcoal-grey) 86%, white 14%);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.026), rgba(255, 255, 255, 0.008)),
        var(--color-graphite);
      box-shadow:
        0 12px 34px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.035);
    }

    :host-context(.dark) .summary-card-accent {
      background:
        linear-gradient(180deg, rgba(2, 184, 204, 0.055), rgba(2, 184, 204, 0.01)),
        var(--color-graphite);
    }

    :host-context(.dark) .summary-card-positive {
      background:
        linear-gradient(180deg, rgba(228, 242, 34, 0.04), rgba(228, 242, 34, 0.008)),
        var(--color-graphite);
    }

    :host-context(.dark) .summary-card-neutral {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.024), rgba(255, 255, 255, 0.006)),
        var(--color-graphite);
    }

    :host-context(.dark) .section-meta {
      border-color: var(--color-charcoal-grey);
      background: rgba(0, 0, 0, 0.16);
      color: var(--color-fog-grey);
    }

    :host-context(.dark) .context-strip {
      border-color: color-mix(in srgb, var(--color-charcoal-grey) 78%, transparent);
      background: rgba(0, 0, 0, 0.12);
    }

    :host-context(.dark) .context-chip {
      border-color: var(--color-charcoal-grey);
      background: color-mix(in srgb, var(--color-deep-slate) 72%, var(--color-graphite) 28%);
      color: var(--color-porcelain);
    }

    :host-context(.dark) .section-head {
      border-bottom-color: color-mix(in srgb, var(--color-charcoal-grey) 78%, transparent);
    }

    :host-context(.dark) .state-card {
      border-color: var(--color-charcoal-grey);
      background: var(--color-graphite);
      color: var(--color-storm-cloud);
    }


    @media (max-width: 1180px) {
      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 860px) {
      .tablero-hero {
        flex-direction: column;
      }

      .hero-actions {
        width: 100%;
        flex-wrap: wrap;
      }

      .section-head {
        flex-direction: column;
      }

      .context-strip {
        align-items: flex-start;
        flex-direction: column;
        gap: 10px;
      }

      .context-separator {
        display: none;
      }

      .context-grow {
        justify-content: flex-start;
      }
    }

    @media (max-width: 640px) {
      .tablero-shell {
        gap: 14px;
      }

      .tablero-hero,
      .summary-card,
      .section-head {
        padding-left: 14px;
        padding-right: 14px;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .tablero-hero h1 {
        font-size: 24px;
      }

      .summary-card strong {
        font-size: 23px;
      }

      .chart-wrap {
        padding-left: 8px;
        padding-right: 8px;
      }
    }
  `],
})
export class TableroComponent implements OnInit {
  private http = inject(HttpClient);
  private vigService = inject(VigenciaService);

  api = `${environment.apiUrl}`;

  criterio = signal(0);
  selectedVigenciaId = signal<number | null>(null);
  vigencias = signal<any[]>([]);
  data = signal<TableroData | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  chartReady = signal(false);
  chartItemsCount = signal(0);

  criterioOptions: SelectOption[] = [
    { label: 'Item', value: 0 },
    { label: 'Renglón', value: 1 },
  ];

  vigenciaOptions = computed<SelectOption[]>(() =>
    this.vigencias().map(v => ({
      label: `Ejercicio ${v.ejercicio}${v.activoEjecucion ? ' (Activo)' : ''}`,
      value: v.idVigencia,
    })),
  );

  chartOptions!: ChartOptions;

  pivotData: any[] = [];

  ngOnInit() {
    this.loadVigencias();
  }

  loadVigencias() {
    this.loading.set(true);
    this.error.set(null);

    this.vigService.getAll().subscribe({
      next: (r: any) => {
        if (r?.success && Array.isArray(r.data)) {
          const sorted = [...r.data].sort(
            (a: any, b: any) => Number(b.ejercicio) - Number(a.ejercicio),
          );

          const active = sorted.find((v: any) => v.activoEjecucion);

          this.vigencias.set(sorted);
          this.selectedVigenciaId.set(active?.idVigencia ?? sorted[0]?.idVigencia ?? null);

          this.loadData();
        } else {
          this.loading.set(false);
          this.error.set('Error al cargar vigencias');
        }
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Error de conexión al cargar vigencias');
      },
    });
  }

  loadData() {
    this.loading.set(true);
    this.error.set(null);
    this.chartReady.set(false);

    const params = new URLSearchParams();
    params.set('criterio', String(this.criterio()));

    const idVigencia = this.selectedVigenciaId();
    if (idVigencia) {
      params.set('idVigencia', String(idVigencia));
    }

    this.http.get<any>(`${this.api}/Tablero?${params.toString()}`).subscribe({
      next: (r: any) => {
        this.loading.set(false);

        if (r?.success && r.data) {
          const tablero = r.data as TableroData;
          const items = tablero.items ?? [];

          this.data.set(tablero);
          this.pivotData = this.mapPivotData(items);
          this.buildChart(items);

          return;
        }

        this.data.set(null);
        this.pivotData = [];
        this.error.set(r?.message || 'Error al cargar datos del tablero');
      },
      error: err => {
        this.loading.set(false);
        this.data.set(null);
        this.pivotData = [];
        this.chartReady.set(false);
        this.error.set(err?.error?.message || 'Error de conexión');
      },
    });
  }

  onCriterioChange(value: any) {
    this.criterio.set(Number(value));
    this.loadData();
  }

  onVigenciaChange(value: any) {
    this.selectedVigenciaId.set(Number(value));
    this.loadData();
  }

  private mapPivotData(items: TableroItem[]): any[] {
    return (items ?? []).map(item => ({
      COTIZACION: item.cotizacion ?? '',
      PROVEEDOR: item.proveedor ?? 'Sin proveedor',
      ITEM: item.item ?? '',
      PRESUPUESTADO: Number(item.presupuestado) || 0,
      SUBASTADO: Number(item.subastado) || 0,
      AHORRADO: Number(item.ahorrado) || 0,
      'AHORRO %': Number(item.porcentajeAhorro) || 0,
    }));
  }

  private buildChart(items: TableroItem[]) {
    const top = [...(items ?? [])]
      .slice(0, 20)
      .reverse();

    this.chartItemsCount.set(top.length);

    if (top.length === 0) {
      this.chartReady.set(false);
      return;
    }

    const storm = this.getCssVar('--color-storm-cloud', '#8a8f98');
    const porcelain = this.getCssVar('--color-porcelain', '#f7f8f8');
    const fog = this.getCssVar('--color-fog-grey', '#62666d');
    const cyan = this.getCssVar('--color-cyan-spark', '#02b8cc');
    const lime = this.getCssVar('--color-neon-lime', '#e4f222');
    const charcoal = this.getCssVar('--color-charcoal-grey', '#23252a');
    const isDark = document.documentElement.classList.contains('dark');

    const chartHeight = Math.min(620, Math.max(260, top.length * 42));

    this.chartOptions = {
      series: [
        {
          name: 'Presupuestado',
          data: top.map(item => this.round2(item.presupuestado)),
        },
        {
          name: 'Subastado',
          data: top.map(item => this.round2(item.subastado)),
        },
        {
          name: 'Ahorrado',
          data: top.map(item => this.round2(item.ahorrado)),
        },
      ],
      chart: {
        type: 'bar',
        height: chartHeight,
        background: 'transparent',
        toolbar: {
          show: false,
        },
        stacked: false,
        animations: {
          enabled: true,
          speed: 350,
        },
      },
      colors: [storm, cyan, lime],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '68%',
          borderRadius: 4,
          borderRadiusApplication: 'around',
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        categories: top.map(item => this.buildCategoryLabel(item)),
        labels: {
          trim: true,
          hideOverlappingLabels: true,
          style: {
            colors: fog,
            fontSize: '10px',
            fontWeight: 510,
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          maxWidth: 260,
          style: {
            colors: fog,
            fontSize: '10px',
            fontWeight: 510,
          },
        },
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        style: {
          fontSize: '12px',
        },
        y: {
          formatter: (value: number) => this.formatCurrency(value),
        },
      },
      theme: {
        mode: (isDark ? 'dark' : 'light') as any,
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: {
          colors: porcelain,
        },
        fontSize: '11px',
        fontWeight: 510,
        itemMargin: {
          horizontal: 10,
        },
        markers: {
          shape: 'circle',
          size: 5,
        },
      },
      grid: {
        borderColor: charcoal,
        strokeDashArray: 4,
        padding: {
          top: 0,
          right: 16,
          bottom: 0,
          left: 6,
        },
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
    };

    this.chartReady.set(true);
  }

  private buildCategoryLabel(item: TableroItem): string {
    const cotizacion = item.cotizacion || `Cotización ${item.idCotizacion}`;
    const proveedor = item.proveedor || 'Sin proveedor';

    return `${cotizacion} · ${proveedor}`;
  }

  private getCssVar(name: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  private round2(value: number): number {
    return Number((Number(value) || 0).toFixed(2));
  }

  private formatCurrency(value: number): string {
    return `$${Number(value || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}