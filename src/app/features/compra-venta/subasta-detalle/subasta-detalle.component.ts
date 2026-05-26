import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SignalRService } from '../../../core/services/signalr.service';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-subasta-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule, LoadingSpinnerComponent],
  templateUrl: './subasta-detalle.component.html',
})
export class SubastaDetalleComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  signalR = inject(SignalRService);
  private cotService = inject(CotizacionService);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);

  idCotizacion = signal<number>(0);
  subasta = signal<SubastaDashboard | null>(null);
  loading = signal(true);
  tick = signal(0);
  private timerInterval: any;

  montoOferta = signal<number>(0);
  ofertando = signal(false);
  proveedorId = signal(1);

  ofertas = computed(() => this.signalR.ofertas().filter(o => o.idCotizacion === this.idCotizacion()));
  mejorOferta = computed(() => {
    const oferts = this.ofertas();
    if (oferts.length === 0) return null;
    return oferts.reduce((min, o) => o.monto < min.monto ? o : min);
  });

  get timeLeft(): string {
    const s = this.subasta();
    if (!s?.fechaFin) return '--:--:--';
    const diff = new Date(s.fechaFin).getTime() - Date.now();
    if (diff <= 0) return 'Finalizada';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  }

  get isLive(): boolean { const s = this.subasta(); if (!s?.fechaFin) return false; return new Date(s.fechaFin).getTime() - Date.now() > 0; }

  async ngOnInit() {
    this.timerInterval = setInterval(() => this.tick.update(v => v + 1), 1000);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.idCotizacion.set(id);

    this.cotService.getById(id).subscribe({
      next: (r: any) => { this.loading.set(false); if (r?.success) this.subasta.set(r.data); },
      error: () => this.loading.set(false)
    });

    const token = this.auth.getToken();
    if (token) {
      await this.signalR.connect(token);
      await this.signalR.joinSubasta(id);
    }
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const id = this.idCotizacion();
    if (id) this.signalR.leaveSubasta(id);
  }

  enviarOferta() {
    const monto = this.montoOferta();
    if (!monto || monto <= 0) return;
    this.ofertando.set(true);

    this.signalR.enviarOferta(
      this.idCotizacion(), null, null, monto, this.proveedorId()
    ).then(success => {
      this.ofertando.set(false);
      if (success) {
        this.montoOferta.set(0);
        this.notify.showSuccess('Oferta enviada');
      } else {
        this.notify.showError('Error al enviar oferta');
      }
    }).catch(() => {
      this.ofertando.set(false);
      this.notify.showError('Error al enviar oferta');
    });
  }
}
