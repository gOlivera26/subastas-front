import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { CotizacionService, SubastaPublicaDetalleDto } from '../../../core/services/cotizacion.service';
import { TimeService } from '../../../core/services/time.service';

@Component({
  selector: 'app-subasta-publica-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './subasta-publica-detalle.component.html',
})
export class SubastaPublicaDetalleComponent implements OnInit, OnDestroy {
  private cotService = inject(CotizacionService);
  private timeService = inject(TimeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  idCotizacion = signal(0);
  subasta = signal<SubastaPublicaDetalleDto | null>(null);
  loading = signal(true);
  error = signal('');

  tick = signal(0);
  private tickTimer: any;
  private pollingTimer: any;

  ngOnInit(): void {
    this.timeService.syncWithServer();

    const id = +(this.route.snapshot.paramMap.get('id') ?? 0);
    if (!id) {
      this.error.set('ID de subasta no válido.');
      this.loading.set(false);
      return;
    }
    this.idCotizacion.set(id);

    // Tick cada 1s para refrescar contadores
    this.tickTimer = setInterval(() => this.tick.update(v => v + 1), 1000);

    this.loadData();

    // Polling cada 10s para mantener datos frescos
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
        } else {
          this.error.set(res.message || 'Error al cargar detalle de la subasta.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || err.message || 'Error de conexión.');
      },
    });
  }

  // ─── Getters ──────────────────────────────────────────────

  get timeLeft(): string {
    const s = this.subasta();
    if (!s?.fechaFin) return '--:--:--';
    const diff = new Date(s.fechaFin).getTime() - this.timeService.now();
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
    return new Date(s.fechaFin).getTime() - this.timeService.now() <= 0;
  }

  get progreso(): number {
    const s = this.subasta();
    if (!s?.fechaInicio || !s?.fechaFin) return 0;
    const inicio = new Date(s.fechaInicio).getTime();
    const fin = new Date(s.fechaFin).getTime();
    const ahora = this.timeService.now();
    if (ahora <= inicio) return 0;
    if (ahora >= fin) return 100;
    return ((ahora - inicio) / (fin - inicio)) * 100;
  }

  get barraColor(): string {
    const p = this.progreso;
    if (p >= 90) return 'bg-red-500';
    if (p >= 70) return 'bg-yellow-500';
    return 'bg-[var(--color-neon-lime)]';
  }

  formatMoneda(valor: number): string {
    return '$ ' + valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
