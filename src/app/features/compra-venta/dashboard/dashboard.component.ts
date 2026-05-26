import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { Vigencia } from '../../../core/models/vigencia.model';

@Component({
  selector: 'app-dashboard-compra-venta',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardCompraVentaComponent implements OnInit, OnDestroy {
  private vigenciaService = inject(VigenciaService);
  private cotizacionService = inject(CotizacionService);
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

  ngOnInit() {
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
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return 'Finalizada';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  onVigenciaChange(val: any) { this.selectedVigenciaId.set(+val); this.loadDashboard(); }

  ngOnDestroy() { if (this.timerInterval) clearInterval(this.timerInterval); }
}
