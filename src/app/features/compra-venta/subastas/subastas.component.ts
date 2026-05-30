import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { AuthService } from '../../../core/services/auth.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { TimeService } from '../../../core/services/time.service'; // <-- INYECTADO

@Component({
  selector: 'app-subastas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './subastas.component.html',
})
export class SubastasComponent implements OnInit {
  private cotizacionService = inject(CotizacionService);
  private vigenciaService = inject(VigenciaService);
  private router = inject(Router);
  public auth = inject(AuthService);
  private timeService = inject(TimeService); // <-- INYECTADO

  vigencias = signal<Vigencia[]>([]);
  filtros = {
    idVigencia: null as number | null,
    nro: '',
    fechaDesde: '',
    fechaHasta: '',
    expte: ''
  };

  listado = signal<SubastaDashboard[]>([]);
  loading = signal(false);

  TIPO_INVERSA = 7;
  TIPO_LICITACION = 8;
  TIPO_DIRECTA = 9;
  TIPO_COMPULSA = 12;
  TIPO_CONT_DIRECTA = 14;

  ngOnInit() {
    this.timeService.syncWithServer(); // Sincroniza al entrar
    this.loadVigencias();
    this.buscar();
  }

  loadVigencias() {
    this.vigenciaService.getAll().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const sorted = res.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigencias.set(sorted);
          const activa = sorted.find((v: any) => v.activoEjecucion);
          if (activa) {
            this.filtros.idVigencia = activa.idVigencia;
          }
        }
      }
    });
  }

  onVigenciaChange(val: any) {
    this.filtros.idVigencia = val ? +val : null;
    this.buscar();
  }

  buscar() {
    this.loading.set(true);
    this.cotizacionService.buscar({
      idVigencia: this.filtros.idVigencia || undefined,
      nro: this.filtros.nro || undefined,
      expte: this.filtros.expte || undefined,
      fechaDesde: this.filtros.fechaDesde || undefined,
      fechaHasta: this.filtros.fechaHasta || undefined
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.listado.set(res.data || []);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  reducirTexto(texto: string): string {
    if (!texto) return '';
    return texto.length > 30 ? texto.substring(0, 30) + '...' : texto;
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearFechaYHora(fecha?: string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  ahora(): number {
    return this.timeService.now(); // <-- USAMOS EL RELOJ SEGURO
  }

  verObservaciones(fechaLimiteImpugnar?: string): boolean {
    if (!fechaLimiteImpugnar) return false;
    return this.ahora() < new Date(fechaLimiteImpugnar).getTime();
  }

  verSobre1(fechaSobre1?: string): boolean {
    if (!fechaSobre1) return false;
    return new Date(fechaSobre1).getTime() < this.ahora();
  }

  verSobre2(fechaSobre2?: string): boolean {
    if (!fechaSobre2) return false;
    return new Date(fechaSobre2).getTime() < this.ahora();
  }

  verActaPrelacion(fechaFinSubasta?: string): boolean {
    if (!fechaFinSubasta) return false;
    return new Date(fechaFinSubasta).getTime() < this.ahora();
  }

  accionNoImplementada(nombre: string) {
    alert(`Acción '${nombre}' en desarrollo (Fase 4 y 5).`);
  }
}