import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-subasta-crear',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './subasta-crear.component.html',
})
export class SubastaCrearComponent implements OnInit {
  private http = inject(HttpClient);
  api = `${environment.apiUrl}`;

  paso = signal(1);
  reservas = signal<any[]>([]);
  selectedIds = signal<Set<number>>(new Set());
  saving = signal(false);
  successNro = signal('');
  tipoContratacion = signal(7);
  observacion = signal('');
  fechaInicio = signal('');
  fechaFin = signal('');
  fechaLimiteConsultas = signal('');
  margenMejora = signal(5);
  criterioAdjudicacion = signal(0);
  permiteProrroga = signal(false);

  ngOnInit() {}

  toggleReserva(id: number) {
    const s = new Set(this.selectedIds()); s.has(id) ? s.delete(id) : s.add(id); this.selectedIds.set(s);
  }

  getSelectedDetalles() {
    return this.reservas().filter(r => this.selectedIds().has(r.idReserva)).map(r => ({
      idReservaDetalle: r.idReservaDetalle || 0, idItem: r.idItem || 0, cantidad: r.cantidad || 1, importeBase: r.importe || 0
    }));
  }

  avanzar() { if (this.selectedIds().size > 0) this.paso.set(2); }
  volver() { this.paso.set(1); }

  save() {
    const detalles = this.getSelectedDetalles();
    if (detalles.length === 0) return;
    this.saving.set(true);
    this.http.post(`${this.api}/Cotizacion`, {
      idTipoContratacion: this.tipoContratacion(),
      observacion: this.observacion(),
      detalles,
      especificacion: {
        fechaInicioSubasta: this.fechaInicio() || null,
        fechaFinalizacionSubasta: this.fechaFin() || null,
        fechaLimiteConsultas: this.fechaLimiteConsultas() || null,
        margenMejora: this.margenMejora(),
        criterioAdjudicacion: this.criterioAdjudicacion(),
        permiteProrroga: this.permiteProrroga()
      }
    }).subscribe({
      next: (r: any) => { this.saving.set(false); if (r?.success) this.successNro.set(r.data?.nroCotizacion || 'OK'); },
      error: () => this.saving.set(false)
    });
  }
}
