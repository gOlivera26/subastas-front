import { Component, OnInit, inject, signal, computed, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { UnidadAdministrativaService } from '../../../core/services/unidad-administrativa.service';
import { SubResponsableService } from '../../../core/services/sub-responsable.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Modal } from '../../../shared/ui/modal/modal';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';
import { AppCalendar } from '../../../shared/ui/app-calendar/app-calendar';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableColumn, TableAction } from '../../../shared/ui/smart-table/table.models';
import { environment } from '../../../../environments/environment';

interface RenglonItem { id: number; nombre: string; itemIds: number[]; }

@Component({
  selector: 'app-subasta', standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Modal, CustomSelect, AppCalendar, SmartTableComponent],
  templateUrl: './subasta.component.html',
})
export class SubastaComponent implements OnInit {
  private cotService = inject(CotizacionService);
  private vigService = inject(VigenciaService);
  private uaService = inject(UnidadAdministrativaService);
  private subRespService = inject(SubResponsableService);
  private http = inject(HttpClient);
  private notify = inject(NotificationService);
  api = `${environment.apiUrl}`;

  items = signal<SubastaDashboard[]>([]); loading = signal(true);
  filterVigencia = signal<number | null>(null); filterEstado = signal<number | null>(null);
  filterNroSubasta = signal(''); filterNroExpte = signal('');
  vigenciaOptions = signal<SelectOption[]>([]); areaOptions = signal<SelectOption[]>([]);
  oficinaOptions = signal<SelectOption[]>([]);
  modalAreaId = signal<number | null>(null); modalOficinaId = signal<number | null>(null);
  estadoOptions: SelectOption[] = [{ label: 'Consultar por estado', value: null }, { label: 'Generado', value: 4 }, { label: 'Publicado', value: 39 }, { label: 'Finalizado', value: 40 }, { label: 'Anulado', value: 20 }];

  showCrear = signal(false); pasoCrear = signal(1);
  reservas = signal<any[]>([]); loadingReservas = signal(false);
  filterNroProvision = signal('');
  selectedIds = signal<number[]>([]); saving = signal(false);
  tipoContratacion = signal(7); observacion = signal('');
  fechaInicio = signal(''); fechaFin = signal('');
  fechaLimiteConsultas = signal(''); margenMejora = signal(5);
  permiteProrroga = signal(false);
  tipoOptions: SelectOption[] = [
    { label: 'Subasta Electrónica Inversa', value: 7 },
    { label: 'Subasta Electrónica Directa', value: 9 },
    { label: 'Subasta Inversa Monto Fijo', value: 13 },
    { label: 'Subasta Inversa SEEC', value: 15 },
  ];

  useRenglones = signal(false);
  renglones = signal<RenglonItem[]>([]);
  renglonCounter = signal(1);
  renglonNombre = signal('');

  // Grilla superior: solo items NO seleccionados
  itemsDisponibles = computed(() => {
    const selected = new Set(this.selectedIds());
    return this.reservas().filter(r => !selected.has(r.id));
  });

  // Grilla inferior: solo items seleccionados
  selectedItems = computed(() =>
    this.reservas().filter(r => this.selectedIds().includes(r.id))
  );

  selectedCount = computed(() => this.selectedIds().length);

  itemsSinRenglon = computed(() => {
    if (!this.useRenglones()) return [];
    const idsEnRenglones = new Set<number>();
    for (const r of this.renglones()) { for (const id of r.itemIds) idsEnRenglones.add(id); }
    return this.selectedItems().filter(item => !idsEnRenglones.has(item.id));
  });

  estadoTpl = viewChild<TemplateRef<any>>('estadoTpl');
  ofertasTpl = viewChild<TemplateRef<any>>('ofertasTpl');
  customTemplates = computed(() => { const m: Record<string, TemplateRef<any>> = {}; const st = this.estadoTpl(); if (st) m['estado'] = st; const ot = this.ofertasTpl(); if (ot) m['ofertas'] = ot; return m; });

  columns: TableColumn[] = [{ header: 'Número', key: 'nroCotizacion', sortable: true }, { header: 'Expediente / Objeto', key: 'titulo', sortable: true }, { header: 'Tipo Contratación', key: 'tipo' }, { header: 'Área', key: 'unidadAdm' }, { header: 'Estado', key: 'estado', type: 'custom' }, { header: 'Inicia', key: 'fechaInicio' }, { header: 'Finaliza', key: 'fechaFin' }, { header: 'Ofertas', key: 'ofertas', type: 'custom' }];
  actions: TableAction[] = [{ action: 'detalle', icon: 'eye', tooltip: 'Ver Detalle' }, { action: 'especificaciones', icon: 'file-text', tooltip: 'Especificaciones' }, { action: 'proveedores', icon: 'users', tooltip: 'Proveedores' }, { action: 'pliegos', icon: 'file-text', tooltip: 'Pliegos' }, { action: 'invitaciones', icon: 'send', tooltip: 'Enviar Invitaciones' }, { action: 'preguntas', icon: 'help-circle', tooltip: 'Preguntas' }, { action: 'anular', icon: 'trash-2', color: 'text-red-400 hover:text-red-300', tooltip: 'Anular' }];

  reservaColumns: TableColumn[] = [
    { header: 'Nota', key: 'nroReserva', sortable: true },
    { header: 'Área', key: 'nombreUnidadAdm' },
    { header: 'Bien / Servicio', key: 'nItem' },
    { header: 'Cant.', key: 'cantidad' },
    { header: 'Mon.', key: 'simboloMoneda' },
    { header: 'Importe', key: 'importe' },
  ];
  selColumns: TableColumn[] = [
    { header: 'Nota', key: 'nroReserva', sortable: true },
    { header: 'Área', key: 'nombreUnidadAdm' },
    { header: 'Bien / Servicio', key: 'nItem' },
    { header: 'Cant.', key: 'cantidad' },
    { header: 'Mon.', key: 'simboloMoneda' },
    { header: 'Importe', key: 'importe' },
  ];
  selActions: TableAction[] = [{ action: 'quitar', icon: 'x', color: 'text-red-400 hover:text-red-300', tooltip: 'Quitar selección' }];

  onAction(event: { action: string; row: any }) {
    const e = event.row.estado;
    const isGenerado = e === 'Generado' || e === 'generado' || event.row.idEstado === 4;
    const isEnviada = e === 'Publicada' || e === 'publicada' || event.row.idEstado === 39;
    const isFinalizada = e === 'Finalizada' || e === 'finalizada' || event.row.idEstado === 40;

    switch (event.action) {
      case 'detalle': this.openDetalle(event.row); break;
      case 'especificaciones':
        if (!isGenerado) { this.notify.showWarning('Solo disponible en estado Generado.'); return; }
        this.openEspecificaciones(event.row); break;
      case 'proveedores':
        if (!isGenerado && !isEnviada) { this.notify.showWarning('Solo disponible en Generado o Publicada.'); return; }
        this.openProveedores(event.row); break;
      case 'pliegos': this.openPliegos(event.row); break;
      case 'invitaciones':
        if (!isGenerado) { this.notify.showWarning('Solo disponible en estado Generado.'); return; }
        this.enviarInvitaciones(event.row); break;
      case 'preguntas': this.openPreguntas(event.row); break;
      case 'anular':
        if (!isGenerado) { this.notify.showWarning('Solo se puede anular en estado Generado.'); return; }
        this.anularSubasta(event.row); break;
      default: this.notify.showInfo(event.action);
    }
  }

  // Action: Detalle
  showDetalle = signal(false); detalleItem = signal<any>(null);
  openDetalle(item: any) { this.detalleItem.set(item); this.showDetalle.set(true); }
  closeDetalle() { this.showDetalle.set(false); }

  // Action: Especificaciones
  showEspec = signal(false); especItem = signal<any>(null);
  especNroExpediente = signal(''); especFechaInicio = signal(''); especFechaFin = signal('');
  especFechaLimite = signal(''); especMargen = signal(5);
  especCriterio = signal(0); especProrroga = signal(false);
  especProrrogaMin = signal(0); especRedet = signal('');
  savingEspec = signal(false);

  openEspecificaciones(item: any) {
    this.especItem.set(item);
    this.http.get<any>(`${this.api}/Cotizacion/${item.idCotizacion}`).subscribe({
      next: (r: any) => {
        if (r?.success && r.data) {
          const e = r.data.especificacion || {};
          this.especNroExpediente.set(e.nroExpediente || '');
          this.especFechaInicio.set(e.fechaInicioSubasta || '');
          this.especFechaFin.set(e.fechaFinalizacionSubasta || '');
          this.especFechaLimite.set(e.fechaLimiteConsultas || '');
          this.especMargen.set(e.margenMejora || 5);
          this.especCriterio.set(e.criterioAdjudicacion ?? 0);
          this.especProrroga.set(e.permiteProrroga || false);
          this.especProrrogaMin.set(e.prorrogaMinutos || 0);
          this.especRedet.set(e.redeterminacion || '');
        }
        this.showEspec.set(true);
      },
      error: () => this.showEspec.set(true),
    });
  }
  closeEspec() { this.showEspec.set(false); }

  grabarEspec() {
    this.savingEspec.set(true);
    this.http.put(`${this.api}/Cotizacion/${this.especItem().idCotizacion}`, {
      idTipoContratacion: this.especItem().tipoContratacionId || 7,
      idVigencia: this.filterVigencia(),
      idUnidadAdm: this.especItem().idUnidadAdm || 0,
      observacion: this.especItem().titulo || '',
      especificacion: {
        nroExpediente: this.especNroExpediente(),
        fechaInicioSubasta: this.especFechaInicio() || null,
        fechaFinalizacionSubasta: this.especFechaFin() || null,
        fechaLimiteConsultas: this.especFechaLimite() || null,
        margenMejora: this.especMargen(),
        criterioAdjudicacion: this.especCriterio(),
        permiteProrroga: this.especProrroga(),
        prorrogaMinutos: this.especProrrogaMin() || null,
        redeterminacion: this.especRedet() || null,
      }
    }).subscribe({
      next: (r: any) => {
        this.savingEspec.set(false);
        if (r?.success) { this.closeEspec(); this.notify.showSuccess('Especificaciones guardadas.'); this.buscar(); }
        else this.notify.showError(r?.message || 'Error');
      },
      error: () => { this.savingEspec.set(false); this.notify.showError('Error al guardar.'); }
    });
  }

  // Action: Proveedores
  showProveedores = signal(false); provItem = signal<any>(null); provList = signal<any[]>([]);
  openProveedores(item: any) { this.provItem.set(item); this.showProveedores.set(true); }
  closeProveedores() { this.showProveedores.set(false); }

  // Action: Pliegos
  showPliegos = signal(false); pliegoItem = signal<any>(null);
  openPliegos(item: any) { this.pliegoItem.set(item); this.showPliegos.set(true); }
  closePliegos() { this.showPliegos.set(false); }

  // Action: Preguntas
  showPreguntas = signal(false); preguntaItem = signal<any>(null);
  openPreguntas(item: any) { this.preguntaItem.set(item); this.showPreguntas.set(true); }
  closePreguntas() { this.showPreguntas.set(false); }

  // Action: Invitaciones
  enviarInvitaciones(item: any) {
    if (!confirm(`¿Publicar la subasta #${item.nroCotizacion}? Esto la hará visible para los proveedores.`)) return;
    this.http.post(`${this.api}/Cotizacion/${item.idCotizacion}/notificar`, {}).subscribe({
      next: (r: any) => {
        if (r?.success) { this.notify.showSuccess('Subasta publicada. Proveedores notificados.'); this.buscar(); }
        else this.notify.showWarning(r?.message || 'Error al publicar');
      },
      error: () => this.notify.showError('Error al publicar.')
    });
  }

  // Action: Anular
  anularSubasta(item: any) {
    if (!confirm(`¿Anular la subasta #${item.nroCotizacion}?`)) return;
    this.http.delete(`${this.api}/Cotizacion/${item.idCotizacion}`).subscribe({
      next: (r: any) => {
        if (r?.success) { this.notify.showSuccess('Subasta anulada.'); this.buscar(); }
        else this.notify.showError(r?.message || 'Error');
      },
      error: () => this.notify.showError('Error al anular.')
    });
  }
  onReservaSelectionChange(ids: number[]) { this.selectedIds.set(ids); }
  quitarItem(row: any) { this.selectedIds.update(arr => arr.filter(id => id !== row.id)); }

  ngOnInit() { this.loadVigencias(); this.loadAreas(); this.loadOficinas(); this.buscar(); }
  loadVigencias() {
    this.vigService.getAll().subscribe({
      next: (r: any) => {
        if (r?.success) {
          const s = r.data.sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigenciaOptions.set(s.map((v: any) => ({ label: 'Ejercicio ' + v.ejercicio + (v.activoEjecucion ? ' (Activo)' : ''), value: v.idVigencia })));
          if (!this.filterVigencia()) {
            const activa = s.find((v: any) => v.activoEjecucion);
            if (activa) this.filterVigencia.set(activa.idVigencia);
            else if (s.length > 0) this.filterVigencia.set(s[0].idVigencia);
          }
        }
      }
    });
  }
  loadAreas() { this.uaService.getAll().subscribe({ next: (r: any) => { if (r?.success) this.areaOptions.set(r.data.map((ua: any) => ({ label: ua.nombreUnidadAdm, value: ua.idUnidadAdm }))); } }); }
  loadOficinas(idUa?: number) { this.subRespService.getAll(idUa).subscribe({ next: (r: any) => { if (r?.success) this.oficinaOptions.set(r.data.map((o: any) => ({ label: o.nombre, value: o.idSubResponsable }))); } }); }
  onModalAreaChange(val: number | null) { this.modalAreaId.set(val); this.modalOficinaId.set(null); this.loadOficinas(val ?? undefined); this.buscarReservas(); }
  onModalOficinaChange(val: number | null) { this.modalOficinaId.set(val); this.buscarReservas(); }
  buscar() { this.loading.set(true); this.cotService.getDelMes(this.filterVigencia() ?? undefined).subscribe({ next: (r: any) => { this.loading.set(false); if (r?.success) this.items.set(r.data || []); }, error: () => this.loading.set(false) }); }
  verTodas() { this.filterVigencia.set(null); this.filterEstado.set(null); this.filterNroSubasta.set(''); this.filterNroExpte.set(''); this.buscar(); }

  openCrear() {
    this.showCrear.set(true); this.pasoCrear.set(1);
    this.selectedIds.set([]); this.reservas.set([]);
    this.filterNroProvision.set('');
    this.modalAreaId.set(null); this.modalOficinaId.set(null);
    this.renglones.set([]); this.useRenglones.set(false);
    this.renglonNombre.set('');
    this.tipoContratacion.set(7); this.observacion.set('');
    this.fechaInicio.set(''); this.fechaFin.set('');
    this.fechaLimiteConsultas.set(''); this.margenMejora.set(5);
    this.permiteProrroga.set(false);
  }
  closeCrear() { this.showCrear.set(false); }

  // Paso 1: elegir renglón o no
  elegirModo(renglon: boolean) {
    this.useRenglones.set(renglon);
    if (!renglon) {
      // Por ítem: ir directo a seleccionar provisiones
      this.pasoCrear.set(2);
      this.buscarReservas();
    } else {
      // Por renglón: quedarse en paso 1 para crear grupos
    }
  }

  addRenglon() {
    const name = this.renglonNombre().trim();
    if (!name) return;
    this.renglones.update(list => [...list, { id: this.renglonCounter(), nombre: name, itemIds: [] }]);
    this.renglonCounter.update(c => c + 1);
    this.renglonNombre.set('');
  }

  removeRenglon(id: number) { this.renglones.update(list => list.filter(r => r.id !== id)); }

  // Paso 1 -> Paso 2: después de crear grupos, ir a seleccionar provisiones
  avanzarASeleccion() {
    if (this.useRenglones() && this.renglones().length === 0) {
      this.notify.showWarning('Creá al menos un grupo antes de continuar.');
      return;
    }
    this.pasoCrear.set(2);
    this.buscarReservas();
  }

  // Paso 2 -> Paso 3: asignar items a renglones o ir a parámetros
  avanzarAParametros() {
    if (this.selectedCount() === 0) {
      this.notify.showWarning('Seleccioná al menos un bien o servicio.');
      return;
    }
    this.pasoCrear.set(3);
  }

  volver() {
    if (this.pasoCrear() === 2) {
      this.pasoCrear.set(1);
      this.selectedIds.set([]);
    } else {
      this.pasoCrear.set(2);
    }
  }

  toggleItemInRenglon(renglonId: number, itemId: number) {
    this.renglones.update(list => {
      const yaAsignado = this.isItemInRenglon(renglonId, itemId);
      return list.map(r => {
        if (r.id === renglonId) {
          const ids = yaAsignado ? r.itemIds.filter(i => i !== itemId) : [...r.itemIds, itemId];
          return { ...r, itemIds: ids };
        }
        return { ...r, itemIds: r.itemIds.filter(i => i !== itemId) };
      });
    });
  }

  isItemInRenglon(renglonId: number, itemId: number): boolean {
    return this.renglones().find(r => r.id === renglonId)?.itemIds.includes(itemId) ?? false;
  }

  buscarReservas() {
    if (!this.showCrear()) return;
    this.loadingReservas.set(true);
    let url = `${this.api}/Reserva`;
    const params: string[] = [];
    if (this.filterVigencia()) params.push(`idVigencia=${this.filterVigencia()}`);
    if (this.modalAreaId()) params.push(`idUnidadAdm=${this.modalAreaId()}`);
    if (this.modalOficinaId()) params.push(`idSubResponsable=${this.modalOficinaId()}`);
    if (this.filterNroProvision()) params.push(`nroReserva=${this.filterNroProvision()}`);
    if (params.length) url += '?' + params.join('&');
    this.http.get<any>(url).subscribe({
      next: (r: any) => {
        this.loadingReservas.set(false);
        if (r?.success) {
          const items: any[] = [];
          for (const reserva of (r.data || [])) {
            for (const det of (reserva.detalles || [])) {
              items.push({ ...det, id: det.idReservaDet });
            }
          }
          this.reservas.set(items);
        }
      },
      error: () => this.loadingReservas.set(false)
    });
  }

  getSelectedDetalles() {
    return this.selectedItems().map(r => {
      let idRenglon: number | undefined;
      if (this.useRenglones()) {
        for (const ren of this.renglones()) {
          if (ren.itemIds.includes(r.id)) { idRenglon = ren.id; break; }
        }
      }
      return {
        idReservaDetalle: r.idReservaDet || 0,
        idItem: r.idItem || 0,
        cantidad: r.cantidad || 1,
        importeBase: r.importe || 0,
        idRenglon,
      };
    });
  }

  grabar() {
    const detalles = this.getSelectedDetalles();
    if (detalles.length === 0) return;
    
    if (this.useRenglones()) {
      const sinRenglon = this.itemsSinRenglon().length;
      if (sinRenglon > 0) {
        this.notify.showWarning(`Hay ${sinRenglon} ítems sin asignar a un grupo.`);
        return;
      }
    }
    
    this.saving.set(true);

    const body: any = {
      idVigencia: this.filterVigencia(),
      idTipoContratacion: this.tipoContratacion(),
      observacion: this.observacion(),
      detalles,
      especificacion: {
        fechaInicioSubasta: this.fechaInicio() || null,
        fechaFinalizacionSubasta: this.fechaFin() || null,
        fechaLimiteConsultas: this.fechaLimiteConsultas() || null,
        margenMejora: this.margenMejora(),
        criterioAdjudicacion: this.useRenglones() ? 1 : 0,
        permiteProrroga: this.permiteProrroga()
      },
    };

    if (this.useRenglones() && this.renglones().length > 0) {
      body.renglones = this.renglones().map(r => ({ numeroRenglon: r.id, descripcion: r.nombre }));
    }

    this.http.post(`${this.api}/Cotizacion`, body).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r?.success) { this.closeCrear(); this.notify.showSuccess('Subasta ' + (r.data?.nroCotizacion || '') + ' creada'); this.buscar(); }
      },
      error: () => { this.saving.set(false); this.notify.showError('Error al crear la subasta'); }
    });
  }
}
