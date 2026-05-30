import { Component, OnInit, inject, signal, computed, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { UnidadAdministrativaService } from '../../../core/services/unidad-administrativa.service';
import { SubResponsableService } from '../../../core/services/sub-responsable.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { Modal } from '../../../shared/ui/modal/modal';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';
import { AppCalendar } from '../../../shared/ui/app-calendar/app-calendar';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { TableColumn, TableAction } from '../../../shared/ui/smart-table/table.models';
import { environment } from '../../../../environments/environment';
import { TimeService } from '../../../core/services/time.service';

interface RenglonItem { id: number; nombre: string; itemIds: number[]; }

@Component({
  selector: 'app-subasta', 
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Modal, CustomSelect, AppCalendar, SmartTableComponent, LoadingSpinnerComponent],
  templateUrl: './subasta.component.html',
})
export class SubastaComponent implements OnInit {
  private cotService = inject(CotizacionService);
  private vigService = inject(VigenciaService);
  private uaService = inject(UnidadAdministrativaService);
  private subRespService = inject(SubResponsableService);
  private http = inject(HttpClient);
  private notify = inject(NotificationService);
  public auth = inject(AuthService);
  private timeService = inject(TimeService);
  signalR = inject(SignalRService);
  api = `${environment.apiUrl}`;

  TIPO_INVERSA = 7;
  TIPO_LICITACION = 8;
  TIPO_DIRECTA = 9;
  TIPO_COMPULSA = 12;
  TIPO_INVERSA_FIJA = 13;
  TIPO_CONT_DIRECTA = 14;
  TIPO_SEEC = 15;

  items = signal<SubastaDashboard[]>([]); loading = signal(true);
  filterVigencia = signal<number | null>(null); filterEstado = signal<number | null>(null);
  filterNroSubasta = signal(''); filterNroExpte = signal('');
  filterAreaId = signal<number | null>(null); filterFecha = signal('');
  vigenciaOptions = signal<SelectOption[]>([]); areaOptions = signal<SelectOption[]>([]);
  oficinaOptions = signal<SelectOption[]>([]);
  modalAreaId = signal<number | null>(null); modalOficinaId = signal<number | null>(null);

  showObsModal = signal(false);
  obsItem = signal<any>(null);
  obsType = signal<'TECNICA' | 'ECONOMICA'>('TECNICA');
  obsText = signal('');
  obsData = signal<any>({});
  loadingObs = signal(false);
  savingObs = signal(false);
  
  estadoOptions: SelectOption[] = [
    { label: 'Todos', value: null }, 
    { label: 'Generado', value: 4 }, 
    { label: 'Enviada Pendiente', value: 39 }, 
    { label: 'Finalizada', value: 40 }, 
    { label: 'Anulada', value: 20 }, 
    { label: 'Desistida', value: 47 }
  ];

  showCrear = signal(false); pasoCrear = signal(1);
  reservas = signal<any[]>([]); loadingReservas = signal(false);
  filterNroProvision = signal('');
  selectedIds = signal<number[]>([]); saving = signal(false);
  tipoContratacion = signal(7); observacion = signal('');
  crearNroExpediente = signal(''); crearRedeterminacion = signal('1');
  fechaInicio = signal(''); fechaFin = signal('');
  fechaLimiteConsultas = signal(''); margenMejora = signal(5);
  permiteProrroga = signal(false); crearProrrogaMinutos = signal<number | null>(null);
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

 itemsDisponibles = computed(() => {
    const selected = new Set(this.selectedIds());
    // Solo mostramos los que no están seleccionados Y que tienen stock disponible
    return this.reservas().filter(r => 
      !selected.has(r.id) && 
      (r.cantidadRestante === undefined || r.cantidadRestante > 0)
    );
  });

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
  accionesTpl = viewChild<TemplateRef<any>>('accionesTpl');
  
  customTemplates = computed(() => { 
    const m: Record<string, TemplateRef<any>> = {}; 
    const st = this.estadoTpl(); if (st) m['estado'] = st; 
    const ot = this.ofertasTpl(); if (ot) m['ofertas'] = ot; 
    const at = this.accionesTpl(); if (at) m['acciones'] = at; 
    return m; 
  });

  columns: TableColumn[] = [
    { header: 'Número', key: 'nroCotizacion', sortable: true }, 
    { header: 'Expediente / Objeto', key: 'titulo', sortable: true }, 
    { header: 'Tipo Contratación', key: 'tipo' }, 
    { header: 'Área', key: 'unidadAdm' }, 
    { header: 'Estado', key: 'estado', type: 'custom' }, 
    { header: 'Inicia', key: 'fechaInicio', type: 'date' }, 
    { header: 'Finaliza', key: 'fechaFin', type: 'date' }, 
    { header: 'Ofertas', key: 'ofertas', type: 'custom' }, 
    { header: 'Acciones', key: 'acciones', type: 'custom' }
  ];
  
  actions: TableAction[] = []; 

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

  // GETTERS PARA FASE 1 (SUBASTA DIRECTA NOMENCLATURA)
  get isDirectaProv(): boolean { return this.provItem()?.idTipoContratacion === this.TIPO_DIRECTA; }
  get isDirectaProp(): boolean { return this.propuestasItem()?.idTipoContratacion === this.TIPO_DIRECTA; }

  ahora(): number {
    return this.timeService.now();
  }

  verActaPrelacion(fecha?: string): boolean {
    if (!fecha) return false;
    return new Date(fecha).getTime() < this.ahora();
  }

  verSobre1(fecha?: string): boolean {
    if (!fecha) return false;
    return new Date(fecha).getTime() < this.ahora();
  }

  accionNoImplementada(nombre: string) {
    this.notify.showInfo(`La funcionalidad '${nombre}' se implementará en la próxima fase.`);
  }

  ngOnInit() { 
    this.loadVigencias(); 
    this.loadAreas(); 
    this.loadOficinas(); 
    this.timeService.syncWithServer(); 
    this.buscar(); 
  }
  
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
  
  buscar() {
    this.loading.set(true);
    this.cotService.buscar({
      idVigencia: this.filterVigencia() ?? undefined,
      idEstado: this.filterEstado() ?? undefined,
      nro: this.filterNroSubasta() || undefined,
      expte: this.filterNroExpte() || undefined,
      fechaDesde: this.filterFecha() || undefined,
    }).subscribe({
      next: (r: any) => { this.loading.set(false); if (r?.success) this.items.set(r.data || []); },
      error: () => { this.loading.set(false); this.notify.showError("Error al recuperar las subastas."); }
    });
  }

  onReservaSelectionChange(ids: number[]) { 
    this.selectedIds.set(ids); 
  }
  
  quitarItem(row: any) { this.selectedIds.update(arr => arr.filter(id => id !== row.id)); }

  openCrear() {
    this.showCrear.set(true); this.pasoCrear.set(1);
    this.selectedIds.set([]); this.reservas.set([]);
    this.filterNroProvision.set('');
    this.modalAreaId.set(null); this.modalOficinaId.set(null);
    this.renglones.set([]); this.useRenglones.set(false);
    this.renglonNombre.set('');
    this.tipoContratacion.set(7); this.observacion.set('');
    this.crearNroExpediente.set(''); this.crearRedeterminacion.set('1');
    this.fechaInicio.set(''); this.fechaFin.set('');
    this.fechaLimiteConsultas.set(''); this.margenMejora.set(5);
    this.permiteProrroga.set(false); this.crearProrrogaMinutos.set(null);
  }
  
  closeCrear() { this.showCrear.set(false); }

  elegirModo(renglon: boolean) {
    this.useRenglones.set(renglon);
    if (!renglon) {
      this.pasoCrear.set(2);
      this.buscarReservas();
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

  avanzarASeleccion() {
    if (this.useRenglones() && this.renglones().length === 0) {
      this.notify.showWarning('Creá al menos un grupo antes de continuar.');
      return;
    }
    this.pasoCrear.set(2);
    this.buscarReservas();
  }

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
              items.push({ ...det, id: det.idReservaDet, idUnidadAdm: reserva.idUnidadAdm });
            }
          }
          this.reservas.set(items);
        }
      },
      error: () => { 
        this.loadingReservas.set(false); 
        this.notify.showError("Error al cargar las provisiones autorizadas."); 
      }
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
        idReservaDetalle: r.idReservaDetalle || r.id,
        idItem: r.idItem || 0,
        // Usamos los valores editados si existen, sino los originales
        cantidad: r._cantidadEditada !== undefined ? r._cantidadEditada : (r.cantidadRestante || r.cantidad || 1),
        importeBase: r._importeEditado !== undefined ? r._importeEditado : (r.importe || 0),
        importeMinimo: r._importeMinimoEditado !== undefined ? r._importeMinimoEditado : null,
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
    
    const primerItemSeleccionado = this.selectedItems()[0];
    const idUnidadAdmReal = primerItemSeleccionado?.idUnidadAdm;

    if (!idUnidadAdmReal || idUnidadAdmReal === 0) {
      this.notify.showError('No se pudo determinar el Área de la subasta a partir del ítem seleccionado.');
      return;
    }
    
    this.saving.set(true);

    const body: any = {
      idVigencia: this.filterVigencia(),
      idUnidadAdm: idUnidadAdmReal,
      idTipoContratacion: this.tipoContratacion(),
      observacion: this.observacion(),
      detalles,
      especificacion: {
        nroExpediente: this.crearNroExpediente() || null,
        fechaInicioSubasta: this.fechaInicio() || null,
        fechaFinalizacionSubasta: this.fechaFin() || null,
        fechaLimiteConsultas: this.fechaLimiteConsultas() || null,
        margenMejora: this.margenMejora(),
        criterioAdjudicacion: this.useRenglones() ? 1 : 0,
        permiteProrroga: this.permiteProrroga(),
        prorrogaMinutos: this.crearProrrogaMinutos() || null,
        redeterminacion: this.crearRedeterminacion() || null
      },
    };

    if (this.useRenglones() && this.renglones().length > 0) {
      body.renglones = this.renglones().map(r => ({ numeroRenglon: r.id, descripcion: r.nombre }));
    }

    this.http.post(`${this.api}/Cotizacion`, body).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        if (r?.success) { 
          this.closeCrear(); 
          this.notify.showSuccess('Subasta ' + (r.data?.nroCotizacion || '') + ' creada con éxito.'); 
          this.buscar(); 
        }
      },
      error: (e) => { 
        this.saving.set(false); 
        this.notify.showError('Error al crear la subasta'); 
      }
    });
  }

  showDetalle = signal(false); detalleItem = signal<any>(null);
  detalleData = signal<any>({}); detalleItems = signal<any[]>([]);
  detalleRenglones = signal<any[]>([]); detalleProveedores = signal<any[]>([]);
  loadingDetalle = signal(false); detalleError = signal(false);
  
  openDetalle(item: any) {
    this.detalleItem.set(item); this.showDetalle.set(true);
    this.detalleData.set({}); this.detalleItems.set([]);
    this.detalleRenglones.set([]); this.detalleProveedores.set([]);
    this.loadingDetalle.set(true); this.detalleError.set(false);
    this.http.get<any>(`${this.api}/Cotizacion/${item.idCotizacion}`).subscribe({
      next: (r: any) => {
        this.loadingDetalle.set(false);
        if (r?.success && r.data) {
          const d = r.data;
          this.detalleData.set(d);
          const detalles = d.detalles || [];
          const renglones = d.renglones || [];
          const proveedores = d.proveedores || [];
          this.detalleItems.set(detalles);
          this.detalleProveedores.set(proveedores.map((p: any) => ({ ...p, _nombre: null })));
          let pendingResolutions = proveedores.length;
          for (const p of proveedores) {
            this.http.get<any>(`${this.api}/Provider/${p.idProveedor}`).subscribe({
              next: (pr: any) => {
                const nombreResuelto = pr?.data?.razonSocial || pr?.data?.nombre || '';
                this.detalleProveedores.update(current => current.map(item => item.idProveedor === p.idProveedor ? { ...item, _nombre: nombreResuelto || `Proveedor #${p.idProveedor}` } : item));
                pendingResolutions--;
              },
              error: () => {
                pendingResolutions--;
                this.detalleProveedores.update(current => current.map(item => item.idProveedor === p.idProveedor ? { ...item, _nombre: `Proveedor #${p.idProveedor}` } : item));
              }
            });
          }
          if (renglones.length > 0) {
            this.detalleRenglones.set(renglones.map((ren: any) => ({
              id: ren.idRenglon, nombre: ren.descripcion || `Renglón ${ren.numeroRenglon}`,
              items: detalles.filter((det: any) => det.idRenglon === ren.idRenglon)
            })));
          } else { this.detalleRenglones.set([]); }
        } else {
          this.detalleError.set(true);
        }
      },
      error: () => { this.loadingDetalle.set(false); this.detalleError.set(true); }
    });
  }
  closeDetalle() { this.showDetalle.set(false); }

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
        else this.notify.showError(r?.message || 'Error al guardar.');
      },
      error: () => { this.savingEspec.set(false); this.notify.showError('Error al guardar.'); }
    });
  }

  showProveedores = signal(false); provItem = signal<any>(null); provList = signal<any[]>([]);
  provSearchTerm = signal(''); provSearchResults = signal<any[]>([]);
  loadingProv = signal(false); savingProv = signal(false);
  
  provSearchFiltered = computed(() => {
    const idsAsignados = new Set(this.provList().map((p: any) => p.idProveedor));
    return this.provSearchResults().filter((p: any) => {
      const id = p.idProveedor || p.id;
      return !idsAsignados.has(id);
    });
  });
  
  openProveedores(item: any) { this.provItem.set(item); this.showProveedores.set(true); this.provSearchTerm.set(''); this.provSearchResults.set([]); this.cargarProveedoresAsignados(); this.buscarProveedores(); }
  closeProveedores() { this.showProveedores.set(false); }
  
  cargarProveedoresAsignados() {
    this.loadingProv.set(true);
    this.http.get<any>(`${this.api}/Cotizacion/${this.provItem().idCotizacion}/Proveedor`).subscribe({
      next: (r: any) => { 
        this.loadingProv.set(false); 
        if (r?.success) {
          const proveedores = (r.data || []).map((p: any) => ({ ...p, _nombre: null }));
          this.provList.set(proveedores);
          for (const p of proveedores) {
            this.http.get<any>(`${this.api}/Provider/${p.idProveedor}`).subscribe({
              next: (pr: any) => {
                const nombre = pr?.data?.razonSocial || pr?.data?.nombre || '';
                const fallback = this.isDirectaProv ? `Oferente #${p.idProveedor}` : `Proveedor #${p.idProveedor}`;
                this.provList.update(list => list.map(i => i.idProveedor === p.idProveedor ? { ...i, _nombre: nombre || fallback } : i));
              },
              error: () => {
                const fallback = this.isDirectaProv ? `Oferente #${p.idProveedor}` : `Proveedor #${p.idProveedor}`;
                this.provList.update(list => list.map(i => i.idProveedor === p.idProveedor ? { ...i, _nombre: fallback } : i))
              }
            });
          }
        }
      },
      error: () => this.loadingProv.set(false)
    });
  }
  
  buscarProveedores() {
    const q = this.provSearchTerm().trim();
    this.loadingProv.set(true);
    this.http.get<any>(`${this.api}/Provider?q=${encodeURIComponent(q || '')}&pageSize=20`).subscribe({
      next: (r: any) => { this.loadingProv.set(false); const items = r?.data?.data || r?.data || []; this.provSearchResults.set(Array.isArray(items) ? items : []); },
      error: () => this.loadingProv.set(false)
    });
  }
  
  agregarProveedor(p: any) {
    const idProv = p.idProveedor || p.id;
    this.savingProv.set(true);
    const entityName = this.isDirectaProv ? 'Oferente' : 'Proveedor';

    this.http.post(`${this.api}/Cotizacion/${this.provItem().idCotizacion}/Proveedor`, { idProveedor: idProv }).subscribe({
      next: () => { this.savingProv.set(false); this.cargarProveedoresAsignados(); this.notify.showSuccess(`${entityName} agregado.`); },
      error: (e: any) => { this.savingProv.set(false); this.notify.showWarning(e.error?.message || 'Error'); }
    });
  }
  
  quitarProveedor(p: any) {
    const entityName = this.isDirectaProv ? 'Oferente' : 'Proveedor';
    this.http.delete(`${this.api}/Cotizacion/${this.provItem().idCotizacion}/Proveedor/${p.idCotizacionProveedor}`).subscribe({
      next: () => { this.cargarProveedoresAsignados(); this.notify.showSuccess(`${entityName} quitado.`); },
      error: () => this.notify.showError('Error al quitar.')
    });
  }

  enviarInvitaciones(item: any) {
    if (!confirm(`¿Publicar la subasta #${item.nroCotizacion}? Esto la hará visible para los participantes asignados.`)) return;
    this.http.post(`${this.api}/Cotizacion/${item.idCotizacion}/notificar`, {}).subscribe({
      next: (r: any) => {
        if (r?.success) { this.notify.showSuccess('Subasta publicada exitosamente.'); this.buscar(); }
        else this.notify.showWarning(r?.message || 'Error al publicar');
      },
      error: () => this.notify.showError('Error al publicar.')
    });
  }

  showPreguntas = signal(false); preguntaItem = signal<any>(null);
  mensajesList = signal<any[]>([]); mensajeNuevo = signal(''); loadingMensajes = signal(false);
  private chatCotizacionId = signal<number>(0);

  openPreguntas(item: any) {
    this.preguntaItem.set(item); this.showPreguntas.set(true);
    this.chatCotizacionId.set(item.idCotizacion);
    this.mensajesList.set([]); this.signalR.clearMensajes();
    this.ensureSignalRConnected().then(() => {
      this.signalR.joinChat(item.idCotizacion);
      this.cargarMensajes();
    });
  }

  private async ensureSignalRConnected() {
    if (!this.signalR.connected()) {
      const token = this.auth.getToken();
      if (token) await this.signalR.connect(token);
    }
  }
  closePreguntas() {
    this.showPreguntas.set(false);
    this.signalR.leaveChat(this.chatCotizacionId());
  }
  cargarMensajes() {
    this.loadingMensajes.set(true);
    this.http.get<any>(`${this.api}/Cotizacion/${this.chatCotizacionId()}/Mensaje`).subscribe({
      next: (r: any) => { this.loadingMensajes.set(false); if (r?.success) this.mensajesList.set(r.data || []); },
      error: () => this.loadingMensajes.set(false)
    });
  }
  enviarMensaje() {
    const c = this.mensajeNuevo().trim(); if (!c) return;
    this.http.post(`${this.api}/Cotizacion/${this.chatCotizacionId()}/Mensaje`, { contenido: c }).subscribe({
      next: () => { this.mensajeNuevo.set(''); },
      error: () => this.notify.showError('Error al enviar.')
    });
  }
  onTyping() { this.signalR.typingChat(this.chatCotizacionId()); }

  chatMessages = computed(() => {
    const loaded = this.mensajesList();
    const live = this.signalR.mensajes();
    const ids = new Set(loaded.map(m => m.idMensaje));
    const newLive = live.filter(m => !ids.has(m.idMensaje));
    return [...loaded, ...newLive];
  });
  get authUsername(): string { return this.auth.currentUser()?.nombreUsuario || ''; }

  showProrroga = signal(false); prorrogaItem = signal<any>(null);
  savingProrroga = signal(false);
  openProrroga(item: any) { this.prorrogaItem.set(item); this.showProrroga.set(true); }
  closeProrroga() { this.showProrroga.set(false); }
  aplicarProrroga() {
    this.savingProrroga.set(true);
    this.http.post(`${this.api}/Cotizacion/${this.prorrogaItem().idCotizacion}/prorrogar`, { minutos: this.prorrogaItem().prorrogaMinutos || 15 }).subscribe({
      next: (r: any) => { this.savingProrroga.set(false); if (r?.success) { this.closeProrroga(); this.notify.showSuccess('Prórroga aplicada.'); this.buscar(); } else this.notify.showWarning(r?.message || 'Error'); },
      error: () => { this.savingProrroga.set(false); this.notify.showError('Error'); }
    });
  }

  desistirSubasta(item: any) {
    if (!confirm(`¿Desistir de la subasta #${item.nroCotizacion}?`)) return;
    this.http.post(`${this.api}/Cotizacion/${item.idCotizacion}/desistir`, {}).subscribe({
      next: (r: any) => { if (r?.success) { this.notify.showSuccess('Subasta desistida.'); this.buscar(); } else this.notify.showWarning(r?.message || 'Error'); },
      error: () => this.notify.showError('Error al desistir.')
    });
  }

  anularSubasta(item: any) {
    if (!confirm(`¿Anular definitivamente la subasta #${item.nroCotizacion}?`)) return;
    this.http.delete(`${this.api}/Cotizacion/${item.idCotizacion}`).subscribe({
      next: (r: any) => {
        if (r?.success) { this.notify.showSuccess('Subasta anulada.'); this.buscar(); }
        else this.notify.showError(r?.message || 'Error');
      },
      error: () => this.notify.showError('Error al anular.')
    });
  }

  showPliegos = signal(false); pliegoItem = signal<any>(null);
  openPliegos(item: any) { this.pliegoItem.set(item); this.showPliegos.set(true); }
  closePliegos() { this.showPliegos.set(false); }


  openObservaciones(item: any, type: 'TECNICA' | 'ECONOMICA') {
    this.obsItem.set(item);
    this.obsType.set(type);
    this.obsText.set('');
    this.obsData.set({});
    this.showObsModal.set(true);
    this.loadObservaciones();
  }

  closeObservaciones() {
    this.showObsModal.set(false);
  }

  loadObservaciones() {
    this.loadingObs.set(true);
    const idCotizacion = this.obsItem().idCotizacion;
    this.http.get<any>(`${this.api}/Licitacion/TraerObservacionesLic?IdCotizacion=${idCotizacion}`).subscribe({
      next: (r: any) => {
        this.loadingObs.set(false);
        const data = r?.success ? r.data : r; 
        if (data) { this.obsData.set(data); }
      },
      error: () => {
        this.loadingObs.set(false);
        this.notify.showError('Error al cargar las observaciones.');
      }
    });
  }

  guardarObservacion() {
    if (!this.obsText().trim()) return;
    this.savingObs.set(true);
    const idCotizacion = this.obsItem().idCotizacion;
    const obsCodificada = encodeURIComponent(this.obsText());
    const url = this.obsType() === 'TECNICA' 
      ? `${this.api}/Licitacion/PublicarObservacion?IdCotizacion=${idCotizacion}&observacion=${obsCodificada}`
      : `${this.api}/Licitacion/PublicarObservacionEco?IdCotizacion=${idCotizacion}&observacion=${obsCodificada}`;

    this.http.post(url, {}).subscribe({
      next: (r: any) => {
        this.savingObs.set(false);
        this.notify.showSuccess('Observación publicada correctamente.');
        this.obsText.set('');
        this.loadObservaciones();
      },
      error: (e: any) => {
        this.savingObs.set(false);
        this.notify.showError(e.error?.message || 'Error al publicar la observación.');
      }
    });
  }

  showDictamen = signal(false); dictamenItem = signal<any>(null);
  dictamenForm = { tipo: '', archivo: null as File | null };
  savingDictamen = signal(false); dictamenList = signal<any[]>([]);

  openDictamen(item: any) {
    this.dictamenItem.set(item);
    this.dictamenForm = { tipo: '', archivo: null };
    this.dictamenList.set([]); 
    this.showDictamen.set(true);
  }
  closeDictamen() { this.showDictamen.set(false); }
  
  onFileDictamenSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.dictamenForm.archivo = file;
  } 

  guardarDictamen() {
    this.notify.showInfo('Módulo Documentos en desarrollo (Endpoint pendiente)');
  }

  showPropuestas = signal(false); propuestasItem = signal<any>(null);
  openPropuestas(item: any) { 
    this.propuestasItem.set(item); 
    this.showPropuestas.set(true); 
    this.provItem.set(item);
    this.cargarProveedoresAsignados();
  }
  closePropuestas() { this.showPropuestas.set(false); }

  showMejoraPrecio = signal(false); mejoraItem = signal<any>(null);
  openMejoraPrecio(item: any) { this.mejoraItem.set(item); this.showMejoraPrecio.set(true); }
  closeMejoraPrecio() { this.showMejoraPrecio.set(false); }

  cambiarEstadoTecnico(proveedor: any, event: any) {
    const nuevoEstado = event.target.value;
    this.provList.update(list => list.map(p => 
      p.idCotizacionProveedor === proveedor.idCotizacionProveedor ? { ...p, ganadora: nuevoEstado } : p
    ));
    
    if (nuevoEstado === 'E') {
      this.notify.showSuccess(`Propuesta técnica aprobada. Se habilitó la apertura del sobre económico.`);
    } else if (nuevoEstado === 'D') {
      this.notify.showWarning(`Propuesta técnica rechazada.`);
    }
  }

  isDesistible(item: any): boolean {
    if (!this.auth.isSuperAdmin()) return false;
    // Solo en estado 39 (Publicada/Enviada Pendiente) o 40 (Finalizada)
    if (item.idEstado !== 39 && item.idEstado !== 40) return false;
    
    // Validar ventanas de tiempo estrictas (Nunca en vivo)
    const inicioStr = item.fechaInicio || item.especificacion?.fechaInicioSubasta;
    const finStr = item.fechaFin || item.especificacion?.fechaFinalizacionSubasta;
    
    if (!inicioStr || !finStr) return false;

    const ahora = this.ahora();
    const inicio = new Date(inicioStr).getTime();
    const fin = new Date(finStr).getTime();

    // Verdadero si la subasta TODAVÍA NO EMPEZÓ o si YA TERMINÓ
    return ahora < inicio || ahora > fin;
  }

  // --- 1. SUBIR IMAGEN (Exclusivo Subasta Directa) ---
  showImagenModal = signal(false);
  imagenItem = signal<any>(null);
  imagenFile = signal<File | null>(null);
  isUploadingImagen = signal(false);
  imagenesSubidas = signal<any[]>([]);

  openSubirImagen(item: any) {
    this.imagenItem.set(item);
    this.showImagenModal.set(true);
    this.imagenFile.set(null);
    this.loadImagenes();
  }

  closeSubirImagen() {
    this.showImagenModal.set(false);
    this.imagenItem.set(null);
  }

  onImagenSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.notify.showError('Por favor, selecciona un archivo de imagen válido.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.notify.showError('La imagen no debe superar los 5MB.');
        return;
      }
      this.imagenFile.set(file);
    }
  }

  loadImagenes() {
    // TODO: Reemplazar por el endpoint real que trae las fotos del lote
    this.imagenesSubidas.set([]);
  }

  subirImagen() {
    const file = this.imagenFile();
    if (!file) return;

    this.isUploadingImagen.set(true);
    const formData = new FormData();
    formData.append('IdCotizacion', this.imagenItem().idCotizacion.toString());
    formData.append('Imagen', file);

    // TODO: Conectar al endpoint real de subida de imágenes para Subasta Directa
    setTimeout(() => {
      this.isUploadingImagen.set(false);
      this.notify.showInfo('Módulo de imágenes en desarrollo. Interfaz lista.');
      this.imagenFile.set(null);
      // Simular que se subió:
      this.imagenesSubidas.update(arr => [...arr, { id: Date.now(), nombre: file.name, url: '#' }]);
    }, 1000);
  }

  eliminarImagen(id: number) {
    if (!confirm('¿Eliminar esta imagen del lote?')) return;
    this.imagenesSubidas.update(arr => arr.filter(img => img.id !== id));
    this.notify.showSuccess('Imagen eliminada.');
  }


  // --- 2. GRÁFICOS DE AHORRO (Exclusivo Subasta Inversa Finalizada) ---
  showGraficosModal = signal(false);
  graficosItem = signal<any>(null);
  loadingGraficos = signal(false);

  openGraficos(item: any) {
    this.graficosItem.set(item);
    this.showGraficosModal.set(true);
    this.loadingGraficos.set(true);

    // TODO: Llamar al endpoint que trae las métricas de ahorro de la subasta
    setTimeout(() => {
      this.loadingGraficos.set(false);
    }, 800);
  }

  closeGraficos() {
    this.showGraficosModal.set(false);
    this.graficosItem.set(null);
  }


  // --- 3. DOCUMENTACIÓN DEL PROVEEDOR GANADOR (Exclusivo Subasta Inversa Finalizada) ---
  showDocProvModal = signal(false);
  docProvItem = signal<any>(null);
  docProvList = signal<any[]>([]);
  loadingDocProv = signal(false);

  openVerDocProveedor(item: any) {
    this.docProvItem.set(item);
    this.showDocProvModal.set(true);
    this.loadingDocProv.set(true);

    // TODO: Llamar al endpoint que trae los adjuntos del proveedor ganador (Constancia AFIP, poderes, etc.)
    setTimeout(() => {
      this.docProvList.set([
        // Data simulada para dejar la UI lista
        { id: 1, proveedor: 'Proveedor Ganador S.A.', tipo: 'Constancia de Inscripción AFIP', fecha: new Date().toISOString() },
        { id: 2, proveedor: 'Proveedor Ganador S.A.', tipo: 'Poder Firmante', fecha: new Date().toISOString() }
      ]);
      this.loadingDocProv.set(false);
    }, 800);
  }

  closeVerDocProveedor() {
    this.showDocProvModal.set(false);
    this.docProvItem.set(null);
  }


  desautorizarItem(item: any) {
    if (!confirm(`¿Estás seguro de que deseas rechazar y quitar el ítem "${item.nItem}" de esta Nota de Pedido?`)) return;
    
    // El ID viene como item.id (mapeado desde idReservaDet en buscarReservas)
    this.http.post<any>(`${this.api}/ReservaDetalle/${item.id}/desautorizar`, {}).subscribe({
      next: (r) => {
        if (r.success) {
          this.notify.showSuccess('Ítem rechazado y quitado de la lista.');
          // Lo quitamos de la lista local para no recargar todo
          this.reservas.update(arr => arr.filter(x => x.id !== item.id));
          this.selectedIds.update(arr => arr.filter(id => id !== item.id));
        } else {
          this.notify.showError(r.message || 'Error al rechazar el ítem.');
        }
      },
      error: () => this.notify.showError('Error de red al rechazar el ítem.')
    });
  }

  actualizarValorItem(item: any, campo: '_cantidadEditada' | '_importeEditado' | '_importeMinimoEditado', valor: number) {
    if (campo === '_cantidadEditada') {
      // Validar que no supere el stock restante
      const maximo = item.cantidadRestante || item.cantidad;
      if (valor > maximo) {
        this.notify.showWarning(`La cantidad no puede superar el stock disponible (${maximo}).`);
        valor = maximo;
      }
      if (valor <= 0) valor = 1;
    }
    
    // Actualizamos el array local
    this.reservas.update(arr => arr.map(x => 
      x.id === item.id ? { ...x, [campo]: valor } : x
    ));
  }

  get totalEstimadoGeneral(): number {
    return this.selectedItems().reduce((acc, item) => {
      const cant = item._cantidadEditada !== undefined ? item._cantidadEditada : (item.cantidadRestante || item.cantidad || 1);
      const imp = item._importeEditado !== undefined ? item._importeEditado : (item.importe || 0);
      return acc + (cant * imp);
    }, 0);
  }

  toggleItemSelection(id: number) {
    const current = this.selectedIds();
    if (current.includes(id)) {
      this.selectedIds.set(current.filter(x => x !== id));
    } else {
      this.selectedIds.set([...current, id]);
    }
  }
}