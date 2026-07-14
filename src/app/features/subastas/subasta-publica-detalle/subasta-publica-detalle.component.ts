import { Component, OnInit, OnDestroy, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CotizacionService, SubastaPublicaDetalleDto } from '../../../core/services/cotizacion.service';
import { AuthService } from '../../../core/services/auth.service';
import { TimeService } from '../../../core/services/time.service';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexStroke, ApexDataLabels, ApexYAxis, ApexFill, ApexTooltip, ApexTheme } from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries; chart: ApexChart; xaxis: ApexXAxis; stroke: ApexStroke;
  dataLabels: ApexDataLabels; yaxis: ApexYAxis; fill: ApexFill; colors: string[];
  tooltip: ApexTooltip; theme: ApexTheme; markers: any;
};

@Component({
  selector: 'app-subasta-publica-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, NgApexchartsModule],
  templateUrl: './subasta-publica-detalle.component.html',
  styleUrls: ['./subasta-publica-detalle.component.css'],
})
export class SubastaPublicaDetalleComponent implements OnInit, OnDestroy {
  private cotService = inject(CotizacionService);
  private timeService = inject(TimeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(AuthService);

  idCotizacion = signal(0);
  subasta = signal<SubastaPublicaDetalleDto | null>(null);
  loading = signal(true);
  error = signal('');
  ahora = signal<number>(0);
  
  private tickTimer: any;
  private pollingTimer: any;

  @ViewChild('chart') chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions>;

  constructor() {
    this.chartOptions = {
      series: [{ name: "Total Subasta", data: [] }],
      chart: { type: "area", height: 300, background: 'transparent', toolbar: { show: false }, animations: { enabled: false }, fontFamily: 'Sora' },
      colors: ['#e4f222'],
      stroke: { curve: "stepline", width: 3 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] } },
      dataLabels: { enabled: false },
      theme: { mode: 'dark' },
      xaxis: { type: "datetime", labels: { style: { colors: '#8a8f98', fontFamily: 'Sora' }, datetimeUTC: false, format: 'HH:mm:ss' }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { style: { colors: '#8a8f98', fontFamily: 'JetBrains Mono' }, formatter: (val) => "$" + val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) } },
      tooltip: { theme: "dark", x: { format: 'HH:mm:ss' } },
      markers: { size: 0 } // Ocultamos los puntos para que se vea más limpio
    };
  }

  ngOnInit(): void {
    this.timeService.syncWithServer();
    this.ahora.set(this.timeService.now());
    this.tickTimer = setInterval(() => this.ahora.set(this.timeService.now()), 1000);

    const id = +(this.route.snapshot.paramMap.get('id') ?? 0);
    if (!id) { this.error.set('ID de subasta no válido.'); this.loading.set(false); return; }
    this.idCotizacion.set(id);

    this.loadData();
    // Polling cada 10s
    this.pollingTimer = setInterval(() => this.loadData(), 10000);
  }

  ngOnDestroy(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  loadData(): void {
    const id = this.idCotizacion();
    if (!id) return;

    this.cotService.getDetallePublico(id).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.subasta.set(res.data);
          this.actualizarGrafico(res.data);
        } else {
          this.error.set(res.message || 'Error al cargar detalle.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || err.message || 'Error de conexión.');
      },
    });
  }

  actualizarGrafico(subasta: SubastaPublicaDetalleDto) {
    if (!subasta.items || subasta.items.length === 0) return;

    const isDirecta = subasta.tipo.includes('Directa');
    const isRenglon = subasta.items[0].esRenglon;

    let totalActual = subasta.items.reduce((sum, el) => sum + (el.precioBase * el.cantidad), 0);
    const bestPerItem: Record<number, number> = {};
    subasta.items.forEach(el => { bestPerItem[el.idElemento] = el.precioBase; });

    const dataPoints: [number, number][] = [];
    if (subasta.fechaInicio) {
      dataPoints.push([new Date(subasta.fechaInicio).getTime(), totalActual]);
    }

    if (subasta.historialOfertas) {
      subasta.historialOfertas.forEach(puja => {
        const idItem = isRenglon ? puja.idRenglon : puja.idCotizacionDetalle;
        if (idItem && bestPerItem[idItem] !== undefined) {
          const precioAnterior = bestPerItem[idItem];
          const cantidad = subasta.items.find(e => e.idElemento === idItem)?.cantidad || 1;

          if ((!isDirecta && puja.monto < precioAnterior) || (isDirecta && puja.monto > precioAnterior)) {
            const diff = precioAnterior - puja.monto;
            totalActual -= (diff * cantidad);
            bestPerItem[idItem] = puja.monto;
            dataPoints.push([new Date(puja.fecha).getTime(), totalActual]);
          }
        }
      });
    }

    // Estirar la línea hasta el momento actual
    const now = this.timeService.now();
    const end = new Date(subasta.fechaFin).getTime();
    if (now < end) {
      dataPoints.push([now, totalActual]);
    } else {
      dataPoints.push([end, totalActual]);
    }

    this.chartOptions.series = [{ name: 'Total Subasta', data: dataPoints }];
    this.chartOptions.colors = [isDirecta ? '#02b8cc' : '#e4f222'];
  }

  // --- Getters ---
  get timeLeft(): string {
    const s = this.subasta();
    if (!s?.fechaFin) return '--:--:--';
    const diff = new Date(s.fechaFin).getTime() - this.ahora();
    if (diff <= 0) return 'Finalizada';
    const days = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    if (days > 0) return `${days}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  get estaFinalizada(): boolean {
    const s = this.subasta();
    if (!s?.fechaFin) return true;
    return new Date(s.fechaFin).getTime() - this.ahora() <= 0;
  }

  get progreso(): number {
    const s = this.subasta();
    if (!s?.fechaInicio || !s?.fechaFin) return 0;
    const inicio = new Date(s.fechaInicio).getTime();
    const fin = new Date(s.fechaFin).getTime();
    const tiempoActual = this.ahora();
    if (tiempoActual <= inicio) return 0;
    if (tiempoActual >= fin) return 100;
    return ((tiempoActual - inicio) / (fin - inicio)) * 100;
  }

  get barraColor(): string {
    const p = this.progreso;
    if (p >= 90) return 'bg-red-500';
    if (p >= 70) return 'bg-yellow-500';
    return 'bg-[var(--color-neon-lime)]';
  }

  formatMoneda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null) return '—';
    return '$ ' + valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatFecha(valor: string | undefined | null): string {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(fecha);
  }

  formatPorcentaje(valor: number): string {
    return Math.max(0, Math.min(100, valor)).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + '%';
  }

  participar(): void {
    const id = this.idCotizacion();
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/compra-venta', 'subasta-detalle', id]);
    } else {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/subastas-activas/${id}` } });
    }
  }
}
