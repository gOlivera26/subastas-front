import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CotizacionService, SubastaPublicaListDto } from '../../../core/services/cotizacion.service';
import { TimeService } from '../../../core/services/time.service';

@Component({
  selector: 'app-subastas-activas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './subastas-activas.component.html',
  styleUrls: ['./subastas-activas.component.css'],
})
export class SubastasActivasComponent implements OnInit, OnDestroy {
  private cotService = inject(CotizacionService);
  private timeService = inject(TimeService);

  subastas = signal<SubastaPublicaListDto[]>([]);
  loading = signal(true);
  error = signal('');

  tick = signal(0);
  private tickTimer: any;

  ngOnInit(): void {
    this.timeService.syncWithServer();
    this.tickTimer = setInterval(() => this.tick.update(v => v + 1), 1000);

    this.cotService.getPublicasActivas().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.subastas.set(res.data);
        } else {
          this.error.set(res.message || 'Error al cargar subastas activas.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || err.message || 'Error de conexión al cargar subastas.');
      },
    });
  }

  ngOnDestroy(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
  }

  get timeLeft(): string {
    // This is a placeholder — the real timeLeft is called per-subasta in the template
    return '';
  }

  timeLeftFor(fechaFin: string): string {
    const diff = new Date(fechaFin).getTime() - this.timeService.now();
    if (diff <= 0) return 'Finalizada';
    const days = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (days > 0) return `${days}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

 formatMoneda(valor: number): string {
    if (valor === undefined || valor === null) return '—';
    return '$ ' + valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
