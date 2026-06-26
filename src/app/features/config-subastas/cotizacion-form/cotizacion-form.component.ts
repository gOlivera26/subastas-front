import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';

@Component({
  selector: 'app-cotizacion-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, CustomSelect],
  templateUrl: './cotizacion-form.component.html',
})
export class CotizacionFormComponent implements OnInit {
  private http = inject(HttpClient);
  private vigService = inject(VigenciaService);
  private orgService = inject(OrganizationService);
  auth = inject(AuthService);
  api = `${environment.apiUrl}`;

  vigencias = signal<Vigencia[]>([]);
  organizaciones = signal<Organization[]>([]);
  reservas = signal<any[]>([]);
  selectedReservas = signal<Set<number>>(new Set());
  saving = signal(false);
  success = signal(false);

  form = {
    idVigencia: null as number | null,
    idOrganizacion: undefined as number | undefined,
    idUnidadAdm: undefined as number | undefined,
    idTipoContratacion: 7,
    observacion: '',
    especificacion: {
      fechaInicioSubasta: '',
      fechaFinalizacionSubasta: '',
      fechaLimiteConsultas: '',
      margenMejora: 5,
      criterioAdjudicacion: 0,
      permiteProrroga: false,
      gestionDocumentacion: false
    },
    detalles: [] as any[]
  };

  vigenciaOptions = computed<SelectOption[]>(() => this.vigencias().map(v => ({
    label: `Ejercicio ${v.ejercicio}${v.activoEjecucion ? ' (Activo)' : ''}`,
    value: v.idVigencia
  })));

  tipoOptions: SelectOption[] = [
    { label: 'Subasta Inversa', value: 7 },
    { label: 'Subasta Directa', value: 9 },
  ];

  organizacionOptions = computed<SelectOption[]>(() => [
    { label: 'Global', value: undefined },
    ...this.organizaciones().map(o => ({ label: o.nombre, value: o.idOrganizacion }))
  ]);

  ngOnInit() {
    this.vigService.getAll().subscribe({ next: (r: any) => { if (r?.success) { const s = r.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio); this.vigencias.set(s); const a = s.find((v: any) => v.activoEjecucion); if (a) { this.form.idVigencia = a.idVigencia; this.loadReservas(); } } } });
    if (this.auth.isSuperAdmin()) this.orgService.getActiveOrganizations().subscribe({ next: (r: any) => { if (r?.success) this.organizaciones.set(r.data); } });
  }

  onVigenciaChange(v: any) { this.form.idVigencia = +v; this.loadReservas(); }

  onTipoContratacionChange(value: any) {
    this.form.idTipoContratacion = Number(value);
    if (this.form.idTipoContratacion === 8) {
      this.form.especificacion.gestionDocumentacion = true;
    }
  }

  loadReservas() {
    if (!this.form.idVigencia) return;
    this.http.get<any>(`${this.api}/Reserva?idVigencia=${this.form.idVigencia}`).subscribe({
      next: (r: any) => { if (r?.success) this.reservas.set(r.data || []); }
    });
  }

  toggleReserva(id: number) {
    const s = new Set(this.selectedReservas());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.selectedReservas.set(s);
    this.form.detalles = this.reservas().filter(r => s.has(r.idReserva)).map(r => ({
      idReservaDetalle: r.idReservaDetalle || r.id,
      idItem: r.idItem || 0,
      cantidad: r.cantidad || 1,
      importeBase: r.importe || r.importeBase || 0
    }));
  }

  save() {
    if (!this.form.idVigencia || this.form.detalles.length === 0) return;
    this.saving.set(true);
    this.http.post(`${this.api}/Cotizacion`, this.form).subscribe({
      next: (r: any) => { this.saving.set(false); if (r?.success) this.success.set(true); },
      error: () => this.saving.set(false)
    });
  }
}
