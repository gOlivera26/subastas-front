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
import { ReporteService } from '../../../core/services/reporte.service';
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
import { forkJoin } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ConfirmationModal } from '../../../shared/ui/confirmation-modal/confirmation-modal';
import { ConfirmationService } from '../../../core/services/confirmation.service';


interface RenglonItem { id: number; nombre: string; itemIds: number[]; }

export interface DonutChartOptions {
  series: any;  
  chart: any;
  labels: any;
  colors: any;
  stroke: any;
  dataLabels: any;
  tooltip: any;
  legend: any;
  plotOptions: any;
}

@Component({
  selector: 'app-subasta',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Modal, CustomSelect, AppCalendar, SmartTableComponent, LoadingSpinnerComponent, NgApexchartsModule, ConfirmationModal],
  templateUrl: './subasta.component.html',
})
export class SubastaComponent implements OnInit {
  private confirmation = inject(ConfirmationService);
  private cotService = inject(CotizacionService);
  private vigService = inject(VigenciaService);
  private uaService = inject(UnidadAdministrativaService);
  private subRespService = inject(SubResponsableService);
  private http = inject(HttpClient);
  private notify = inject(NotificationService);
  private reporteService = inject(ReporteService);
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

  itemToPublish = signal<any>(null);
  itemToAnular = signal<any>(null);
  itemToDesistir = signal<any>(null);
  generatingGanadores = signal<number | null>(null);
  openSubastaActions = signal<string | null>(null);
  subastaActionsMenuPosition = signal<{ top: number; left: number; maxHeight: number } | null>(null);

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
  tipoContratacionOptions: SelectOption[] = [
    { label: 'Subasta Electronica Inversa', value: 7 },
  ];

  dictamenTipoOptions: SelectOption[] = [
    { label: '-- Seleccionar Tipo --', value: '' },
    { label: 'Pliego', value: 'S/D' },
    { label: 'Dictamen', value: 'DIC' },
    { label: 'Informe', value: 'ANX' },
    { label: 'Otro', value: 'OTR' },
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

  useRenglones = signal(false);
  renglones = signal<RenglonItem[]>([]);
  renglonCounter = signal(1);
  renglonNombre = signal('');

  itemsDisponibles = computed(() => {
    const selected = new Set(this.selectedIds());
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


  rowActionKey(item: any): string {
    return String(item?.idCotizacion ?? item?.id ?? item?.nroCotizacion ?? '');
  }

  subastaActionsPopoverId(item: any): string {
    return `subasta-actions-${this.rowActionKey(item)}`;
  }
  isSubastaActionsOpen(key: string): boolean {
    return this.openSubastaActions() === key;
  }

  toggleSubastaActions(item: any, event?: Event) {
    event?.stopPropagation();
    const key = this.rowActionKey(item);
    const popoverId = this.subastaActionsPopoverId(item);
    const popover = document.getElementById(popoverId) as HTMLElement & { showPopover?: () => void; hidePopover?: () => void } | null;

    if (this.openSubastaActions() === key) {
      popover?.hidePopover?.();
      this.closeSubastaActions();
      return;
    }

    const target = event?.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const margin = 12;
      const gap = 8;
      const menuWidth = 240;
      const preferredHeight = 420;
      const minUsableHeight = 180;
      const visibleActions = popover?.querySelectorAll('button[title]').length ?? 0;
      const estimatedItemHeight = 36;
      const menuChrome = 14;
      const estimatedMenuHeight = Math.max(54, Math.min(preferredHeight, (visibleActions * estimatedItemHeight) + menuChrome));
      const availableBelow = Math.max(0, window.innerHeight - rect.bottom - gap - margin);
      const availableAbove = Math.max(0, rect.top - gap - margin);
      const openUp = availableBelow < Math.min(minUsableHeight, estimatedMenuHeight) && availableAbove > availableBelow;
      const availableSpace = openUp ? availableAbove : availableBelow;
      const maxHeight = Math.max(
        140,
        Math.min(preferredHeight, estimatedMenuHeight, availableSpace || estimatedMenuHeight)
      );
      const measuredHeight = popover?.scrollHeight
        ? Math.ceil(popover.scrollHeight)
        : estimatedMenuHeight;
      const menuHeight = Math.min(maxHeight, measuredHeight);
      const left = Math.max(margin, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - margin));
      const top = openUp
        ? Math.max(margin, rect.top - gap - menuHeight)
        : Math.max(margin, Math.min(rect.bottom + gap, window.innerHeight - menuHeight - margin));

      this.subastaActionsMenuPosition.set({ top, left, maxHeight });
    }

    this.openSubastaActions.set(key);
    setTimeout(() => {
      popover?.showPopover?.();
      if (!target || !popover) return;

      requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const margin = 12;
        const gap = 8;
        const menuWidth = 240;
        const preferredHeight = 420;
        const minUsableHeight = 180;
        const visibleActions = popover.querySelectorAll('button[title]').length;
        const estimatedItemHeight = 36;
        const menuChrome = 14;
        const estimatedMenuHeight = Math.max(54, Math.min(preferredHeight, (visibleActions * estimatedItemHeight) + menuChrome));
        const availableBelow = Math.max(0, window.innerHeight - rect.bottom - gap - margin);
        const availableAbove = Math.max(0, rect.top - gap - margin);
        const openUp = availableBelow < Math.min(minUsableHeight, estimatedMenuHeight) && availableAbove > availableBelow;
        const availableSpace = openUp ? availableAbove : availableBelow;
        const maxHeight = Math.max(
          140,
          Math.min(preferredHeight, estimatedMenuHeight, availableSpace || estimatedMenuHeight)
        );
        const renderedHeight = Math.ceil(popover.getBoundingClientRect().height || popover.scrollHeight || estimatedMenuHeight);
        const menuHeight = Math.min(maxHeight, renderedHeight);
        const left = Math.max(margin, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - margin));
        const top = openUp
          ? Math.max(margin, rect.top - gap - menuHeight)
          : Math.max(margin, Math.min(rect.bottom + gap, window.innerHeight - menuHeight - margin));

        this.subastaActionsMenuPosition.set({ top, left, maxHeight });
      });
    });
  }

  closeSubastaActions() {
    if (this.openSubastaActions()) {
      const current = document.getElementById(`subasta-actions-${this.openSubastaActions()}`) as HTMLElement & { hidePopover?: () => void } | null;
      current?.hidePopover?.();
    }
    this.openSubastaActions.set(null);
    this.subastaActionsMenuPosition.set(null);
  }
  ngOnInit() {
    this.loadVigencias();
    this.loadAreas();
    this.loadOficinas();
    this.timeService.syncWithServer();
    this.buscar();
  }


  abrirActaPrelacion(item: any) {
    this.reporteService.descargarActaPrelacion(item.idCotizacion).subscribe({
      next: (blob) => this.reporteService.abrirPdf(blob),
      error: (err) => this.notify.showError(err.error?.message || 'No se pudo generar el informe final de subasta.')
    });
  }

  generarGanadores(item: any) {
    if (!item?.idCotizacion || this.generatingGanadores() === item.idCotizacion) return;

    this.generatingGanadores.set(item.idCotizacion);
    this.http.post<any>(`${this.api}/Ganador/${item.idCotizacion}/generar`, {}).subscribe({
      next: (res) => {
        this.generatingGanadores.set(null);
        if (res?.success) {
          const count = Array.isArray(res.data) ? res.data.length : 0;
          this.notify.showSuccess(count > 0
            ? `Ganadores registrados: ${count}`
            : 'No se generaron ganadores: no hay ofertas válidas para adjudicar.');
        } else {
          this.notify.showError(res?.message || 'No se pudieron generar los ganadores.');
        }
      },
      error: (err) => {
        this.generatingGanadores.set(null);
        this.notify.showError(err.error?.message || 'No se pudieron generar los ganadores.');
      }
    });
  }

  abrirDetalleSubasta(item: any) {
    this.reporteService.descargarDetalleSubasta(item.idCotizacion).subscribe({
      next: (blob) => this.reporteService.abrirPdf(blob),
      error: (err) => this.notify.showError(err.error?.message || 'No se pudo generar el detalle de subasta.')
    });
  }

  abrirProveedoresInvitados(item: any) {
    this.reporteService.descargarProveedoresInvitados(item.idCotizacion).subscribe({
      next: (blob) => this.reporteService.abrirPdf(blob),
      error: (err) => this.notify.showError(err.error?.message || 'No se pudo generar el listado de proveedores invitados.')
    });
  }

  abrirPreguntasRespuestas(item: any) {
    this.reporteService.descargarPreguntasRespuestas(item.idCotizacion).subscribe({
      next: (blob) => this.reporteService.abrirPdf(blob),
      error: (err) => this.notify.showError(err.error?.message || 'No se pudo generar el reporte de preguntas y respuestas.')
    });
  }

  abrirDesistimiento(item: any) {
    this.reporteService.descargarDesistimiento(item.idCotizacion).subscribe({
      next: (blob) => this.reporteService.abrirPdf(blob),
      error: (err) => this.notify.showError(err.error?.message || 'No se pudo generar la constancia de desistimiento.')
    });
  }

  abrirObservacionesProveedores(item: any) {
    this.reporteService.descargarObservacionesProveedores(item.idCotizacion).subscribe({
      next: (blob) => this.reporteService.abrirPdf(blob),
      error: (err) => this.notify.showError(err.error?.message || 'No se pudo generar el reporte de observaciones de proveedores.')
    });
  }

  abrirAuditoriaSubasta(item: any) {
    this.reporteService.descargarAuditoriaSubasta(item.idCotizacion).subscribe({
      next: (blob) => this.reporteService.abrirPdf(blob),
      error: (err) => this.notify.showError(err.error?.message || 'No se pudo generar el reporte de auditoría de subasta.')
    });
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
    this.closeSubastaActions();
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

getRenglonOfItem(itemId: number): string {
    const ren = this.renglones().find(r => r.itemIds.includes(itemId));
    return ren ? ren.id.toString() : '';
  }

  // Se ejecuta cuando el usuario cambia el select en la tabla
  setItemRenglon(renglonIdStr: string, itemId: number) {
    const newRenglonId = renglonIdStr ? Number(renglonIdStr) : null;

    this.renglones.update(list => {
      return list.map(r => {
        // 1. Lo removemos de todos los renglones para evitar duplicados
        let newItemIds = r.itemIds.filter(id => id !== itemId);
        
        // 2. Lo agregamos al nuevo renglón seleccionado
        if (r.id === newRenglonId) {
          newItemIds.push(itemId);
        }
        
        return { ...r, itemIds: newItemIds };
      });
    });
  }

  getItemById(id: number) {
    return this.selectedItems().find(i => i.id === id);
  }

  calcularSubtotalRenglon(renglon: any): number {
    let total = 0;
    for (const itemId of renglon.itemIds) {
      const item = this.getItemById(itemId);
      if (item) {
        const cant = item._cantidadEditada !== undefined ? item._cantidadEditada : (item.cantidadRestante || item.cantidad || 1);
        const imp = item._importeEditado !== undefined ? item._importeEditado : (item.importe || 0);
        total += cant * imp;
      }
    }
    return total;
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
      error: () => {
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
          for (const p of proveedores) {
            this.http.get<any>(`${this.api}/Provider/${p.idProveedor}`).subscribe({
              next: (pr: any) => {
                const nombreResuelto = pr?.data?.razonSocial || pr?.data?.nombre || '';
                this.detalleProveedores.update(current => current.map(item => item.idProveedor === p.idProveedor ? { ...item, _nombre: nombreResuelto || `Proveedor #${p.idProveedor}` } : item));
              },
              error: () => {
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
  especCriterio = signal(0); especCriterioOriginal = signal(0); especProrroga = signal(false);
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
          this.especCriterioOriginal.set(e.criterioAdjudicacion ?? 0);
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
        criterioAdjudicacion: this.especCriterioOriginal(),
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
  provRubrosTree = signal<any[]>([]); provRubroId = signal<number | null>(null); provRubroResults = signal<any[]>([]);
  loadingProv = signal(false); loadingProvRubro = signal(false); savingProv = signal(false); savingProvRubro = signal(false);

  provSearchFiltered = computed(() => {
    const idsAsignados = new Set(this.provList().map((p: any) => p.idProveedor));
    return this.provSearchResults().filter((p: any) => {
      const id = p.idProveedor || p.id;
      return !idsAsignados.has(id);
    });
  });

  provRubroFiltered = computed(() => {
    const idsAsignados = new Set(this.provList().map((p: any) => p.idProveedor));
    return this.provRubroResults().filter((p: any) => !idsAsignados.has(p.idProveedor || p.id));
  });

  provRubroOptions = computed<SelectOption[]>(() => [
    { label: 'Seleccionar rubro...', value: null },
    ...this.flattenRubros(this.provRubrosTree()).map((r: any) => ({ label: r.label, value: r.id }))
  ]);

  openProveedores(item: any) {
    this.provItem.set(item);
    this.showProveedores.set(true);
    this.provSearchTerm.set('');
    this.provSearchResults.set([]);
    this.provRubroId.set(null);
    this.provRubroResults.set([]);
    this.cargarProveedoresAsignados();
    this.buscarProveedores();
    this.cargarRubrosParaInvitar();
  }
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
                this.provList.update(list => list.map(i => i.idProveedor === p.idProveedor ? { ...i, _nombre: fallback } : i));
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

  cargarRubrosParaInvitar() {
    if (this.provRubrosTree().length > 0) return;
    this.http.get<any>(`${this.api}/Rubro/tree`).subscribe({
      next: (r: any) => { if (r?.success && Array.isArray(r.data)) this.provRubrosTree.set(r.data); },
      error: () => this.provRubrosTree.set([])
    });
  }

  buscarProveedoresPorRubro() {
    const rubroId = this.provRubroId();
    this.provRubroResults.set([]);
    if (!rubroId) return;

    this.loadingProvRubro.set(true);
    this.http.get<any>(`${this.api}/Provider/by-rubro/${rubroId}?includeChildren=true`).subscribe({
      next: (r: any) => {
        this.loadingProvRubro.set(false);
        const items = r?.data || [];
        this.provRubroResults.set(Array.isArray(items) ? items : []);
      },
      error: () => {
        this.loadingProvRubro.set(false);
        this.provRubroResults.set([]);
      }
    });
  }

  agregarProveedoresPorRubro() {
    const candidatos = this.provRubroFiltered();
    if (candidatos.length === 0) return;

    this.savingProvRubro.set(true);
    const requests = candidatos.map((p: any) =>
      this.http.post(`${this.api}/Cotizacion/${this.provItem().idCotizacion}/Proveedor`, { idProveedor: p.idProveedor || p.id })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.savingProvRubro.set(false);
        this.provRubroResults.set([]);
        this.cargarProveedoresAsignados();
        this.notify.showSuccess(candidatos.length + ' proveedor' + (candidatos.length === 1 ? '' : 'es') + ' agregado' + (candidatos.length === 1 ? '' : 's') + ' por rubro.');
      },
      error: (e: any) => {
        this.savingProvRubro.set(false);
        this.cargarProveedoresAsignados();
        this.notify.showWarning(e.error?.message || 'No se pudieron agregar todos los proveedores del rubro.');
      }
    });
  }

  flattenRubros(nodes: any[], level = 0): any[] {
    const result: any[] = [];
    for (const node of nodes || []) {
      result.push({ id: node.id, codigo: node.codigo, descripcion: node.descripcion, label: '  '.repeat(level) + node.codigo + ' - ' + node.descripcion });
      result.push(...this.flattenRubros(node.children || [], level + 1));
    }
    return result;
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
    this.itemToPublish.set(item);
  }

  confirmPublish() {
    const item = this.itemToPublish();
    if (!item) return;

    this.http.post(`${this.api}/Cotizacion/${item.idCotizacion}/notificar`, {}).subscribe({
      next: (r: any) => {
        if (r?.success) { this.notify.showSuccess('Subasta publicada exitosamente.'); this.buscar(); }
        else this.notify.showWarning(r?.message || 'Error al publicar');
        this.itemToPublish.set(null);
      },
      error: () => { 
        this.notify.showError('Error al publicar.'); 
        this.itemToPublish.set(null); 
      }
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
    this.itemToDesistir.set(item);
  }

  anularSubasta(item: any) {
    this.itemToAnular.set(item);
  }
  
  confirmDesistir() {
    const item = this.itemToDesistir();
    if (!item) return;

    this.http.post(`${this.api}/Cotizacion/${item.idCotizacion}/desistir`, {}).subscribe({
      next: (r: any) => { 
        if (r?.success) { this.notify.showSuccess('Subasta desistida.'); this.buscar(); } 
        else this.notify.showWarning(r?.message || 'Error'); 
        this.itemToDesistir.set(null);
      },
      error: () => { 
        this.notify.showError('Error al desistir.'); 
        this.itemToDesistir.set(null);
      }
    });
  }

  confirmAnular() {
    const item = this.itemToAnular();
    if (!item) return;

    this.http.delete(`${this.api}/Cotizacion/${item.idCotizacion}`).subscribe({
      next: (r: any) => {
        if (r?.success) { this.notify.showSuccess('Subasta anulada.'); this.buscar(); }
        else this.notify.showError(r?.message || 'Error');
        this.itemToAnular.set(null);
      },
      error: () => { 
        this.notify.showError('Error al anular.'); 
        this.itemToAnular.set(null); 
      }
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

  closeObservaciones() { this.showObsModal.set(false); }

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
      next: () => {
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
    this.cargarDocumentos(item.idCotizacion);
  }

  cargarDocumentos(idCotizacion: number) {
    this.cotService.getDocumentos(idCotizacion).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const docs = res.data.map((d: any) => ({
            ...d,
            tipoLabel: this.getTipoDocumentoLabel(d.tipoDocumento)
          }));
          this.dictamenList.set(docs);
        } else {
          this.dictamenList.set([]);
        }
      }
    });
  }

  getTipoDocumentoLabel(tipo: string): string {
    const tipos: Record<string, string> = {
      'S/D': 'Pliego', 'DIC': 'Dictamen', 'ANX': 'Informe',
      'ANT': 'Informe Técnico / Acta de Evaluación Técnica',
      'INS': 'Notas Aclaratorias', 'ACT': 'Acta de Adjudicación',
      'ACP': 'Acta de Preadjudicación', 'ASE': 'Asesoramiento',
      'RES': 'Resolución', 'REF': 'Resolución Final'
    };
    return tipos[tipo] || tipo;
  }

  closeDictamen() { this.showDictamen.set(false); }

  onFileDictamenSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        this.notify.showError('El archivo supera los 20MB permitidos.');
        return;
      }
      this.dictamenForm.archivo = file;
    }
  }

  guardarDictamen() {
    if (!this.dictamenForm.tipo || !this.dictamenForm.archivo) return;
    this.savingDictamen.set(true);
    const formData = new FormData();
    formData.append('TipoDocumento', this.dictamenForm.tipo);
    formData.append('Archivo', this.dictamenForm.archivo);

    this.cotService.subirDocumento(this.dictamenItem().idCotizacion, formData).subscribe({
      next: (res: any) => {
        this.savingDictamen.set(false);
        if (res.success) {
          this.notify.showSuccess('Documento subido correctamente a Cloudflare R2.');
          this.dictamenForm = { tipo: '', archivo: null };
          this.cargarDocumentos(this.dictamenItem().idCotizacion);
        } else {
          this.notify.showError(res.message || 'Error al subir el documento.');
        }
      },
      error: (err) => {
        this.savingDictamen.set(false);
        this.notify.showError(err.error?.message || 'Error de comunicación con el servidor.');
      }
    });
  }

  async eliminarDictamen(idDocumento: number) {
    if (!(await this.confirmation.confirm({ title: 'Eliminar documento', message: '¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.', confirmText: 'Eliminar', type: 'danger' }))) return;
    this.cotService.eliminarDocumento(this.dictamenItem().idCotizacion, idDocumento).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notify.showSuccess('Documento eliminado.');
          this.cargarDocumentos(this.dictamenItem().idCotizacion);
        } else {
          this.notify.showError(res.message || 'Error al eliminar.');
        }
      }
    });
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
    if (item.idEstado !== 39 && item.idEstado !== 40) return false;
    const inicioStr = item.fechaInicio || item.especificacion?.fechaInicioSubasta;
    const finStr = item.fechaFin || item.especificacion?.fechaFinalizacionSubasta;
    if (!inicioStr || !finStr) return false;
    const ahora = this.ahora();
    const inicio = new Date(inicioStr).getTime();
    const fin = new Date(finStr).getTime();
    return ahora < inicio || ahora > fin;
  }

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
      this.imagenesSubidas.update(arr => [...arr, { id: Date.now(), nombre: file.name, url: '#' }]);
    }, 1000);
  }

  async eliminarImagen(id: number) {
    if (!(await this.confirmation.confirm({ title: 'Eliminar imagen', message: '¿Eliminar esta imagen del lote?', confirmText: 'Eliminar', type: 'danger' }))) return;
    this.imagenesSubidas.update(arr => arr.filter(img => img.id !== id));
    this.notify.showSuccess('Imagen eliminada.');
  }

  showGraficosModal = signal(false);
  graficosItem = signal<any>(null);
  loadingGraficos = signal(false);
  metricasAhorro = signal<any>(null);

public chartOptionsAhorro: Partial<DonutChartOptions> = {
    series: [],
    chart: { type: 'donut', height: 350, background: 'transparent', animations: { enabled: true, speed: 800 } },
    labels: ['Monto Adjudicado', 'Ahorro Generado (No gastado)'],
    colors: ['#02b8cc', '#10b981'], // Cyan para el gasto, Emerald para el ahorro
    stroke: { show: true, colors: ['#0d1117'], width: 2 },
    dataLabels: { enabled: true, formatter: (val: number) => val.toFixed(1) + '%' },
    tooltip: { theme: 'dark', y: { formatter: (val: number) => '$ ' + val.toLocaleString('es-AR', { minimumFractionDigits: 2 }) } },
    legend: { position: 'bottom', labels: { colors: '#f7f8f8' } },
    plotOptions: { pie: { donut: { size: '65%' } } }
  };

  openGraficos(item: any) {
    this.graficosItem.set(item);
    this.showGraficosModal.set(true);
    this.loadingGraficos.set(true);
    this.metricasAhorro.set(null);

    this.cotService.getMetricasAhorro(item.idCotizacion).subscribe({
      next: (res: any) => {
        this.loadingGraficos.set(false);
        if (res.success && res.data) {
          this.metricasAhorro.set(res.data);
          // Calculamos los valores para el gráfico (Gasto vs Ahorro)
          const ahorroAbsoluto = res.data.presupuestoBase - res.data.mejorOfertaFinal;
          this.chartOptionsAhorro['series'] = [res.data.mejorOfertaFinal, ahorroAbsoluto > 0 ? ahorroAbsoluto : 0];
        } else {
          this.notify.showError(res.message || 'Error al obtener métricas');
        }
      },
      error: () => {
        this.loadingGraficos.set(false);
        this.notify.showError('Error de comunicación con el servidor.');
      }
    });
  }

  closeGraficos() {
    this.showGraficosModal.set(false);
    this.graficosItem.set(null);
  }
  showDocProvModal = signal(false);
  docProvItem = signal<any>(null);
  docProvList = signal<any[]>([]);
  loadingDocProv = signal(false);

  docProvGarantias = signal<any[]>([]);
  docProvItems = signal<any[]>([]);

  docProvTab = signal<'GARANTIAS' | 'ITEMS'>('GARANTIAS');

  openVerDocProveedor(item: any) {
    this.docProvItem.set(item);
    this.showDocProvModal.set(true);
    this.loadingDocProv.set(true);
    this.docProvTab.set('GARANTIAS');
    
    this.docProvGarantias.set([]);
    this.docProvItems.set([]);

    // Ejecutamos las 3 peticiones en paralelo: Detalles de Subasta (para nombres de ítems), Garantías y Docs.
    forkJoin({
      subasta: this.cotService.getById(item.idCotizacion),
      garantias: this.cotService.getGarantias(item.idCotizacion),
      docs: this.cotService.getDocumentosItem(item.idCotizacion)
    }).subscribe({
      next: (res) => {
        // 1. Mapear Garantías
        if (res.garantias.success && res.garantias.data) {
          const garantiasMap = res.garantias.data.map(g => ({ ...g, _nombreProveedor: `Cargando... (ID: ${g.idProveedor})` }));
          this.docProvGarantias.set(garantiasMap);
          this.resolverNombresProveedores(garantiasMap, this.docProvGarantias);
        }

        // 2. Mapear Documentos por Ítem/Renglón
        if (res.docs.success && res.docs.data && res.subasta.success && res.subasta.data) {
          const isRenglon = res.subasta.data.especificacion?.criterioAdjudicacion === 1;
          const elementosSubasta = isRenglon ? res.subasta.data.renglones : res.subasta.data.detalles;

          const docsMap = res.docs.data.map((d: any) => {
            // Buscar el nombre del ítem o renglón
            const targetId = isRenglon ? d.idRenglon : d.idCotizacionDetalle;
            const elementoObj = elementosSubasta?.find((el: any) => 
               isRenglon ? el.idRenglon === targetId : el.idCotizacionDetalle === targetId
            );
            
            return {
              ...d,
              _nombreProveedor: `Cargando... (ID: ${d.idProveedor})`,
              _nombreElemento: elementoObj ? (isRenglon ? elementoObj.descripcion : elementoObj.nItem) : 'Elemento Desconocido'
            };
          });

          this.docProvItems.set(docsMap);
          this.resolverNombresProveedores(docsMap, this.docProvItems);
        }

        this.loadingDocProv.set(false);
      },
      error: () => {
        this.loadingDocProv.set(false);
        this.notify.showError('Error al recuperar la documentación de los proveedores.');
      }
    });
  }

  private resolverNombresProveedores(lista: any[], signalToUpdate: any) {
    const idsUnicos = [...new Set(lista.map(item => item.idProveedor))];
    
    idsUnicos.forEach(id => {
      this.http.get<any>(`${this.api}/Provider/${id}`).subscribe({
        next: (pr: any) => {
          const nombre = pr?.data?.razonSocial || pr?.data?.nombre || `Proveedor #${id}`;
          signalToUpdate.update((currentList: any[]) => 
            currentList.map(item => item.idProveedor === id ? { ...item, _nombreProveedor: nombre } : item)
          );
        },
        error: () => {
          signalToUpdate.update((currentList: any[]) => 
            currentList.map(item => item.idProveedor === id ? { ...item, _nombreProveedor: `Proveedor #${id}` } : item)
          );
        }
      });
    });
  }

 closeVerDocProveedor() {
    this.showDocProvModal.set(false);
    this.docProvItem.set(null);
  }

  async desautorizarItem(item: any) {
    if (!(await this.confirmation.confirm({ title: 'Rechazar ítem', message: `¿Estás seguro de que deseas rechazar y quitar el ítem "${item.nItem}" de esta Nota de Pedido?`, confirmText: 'Rechazar', type: 'warning' }))) return;
    this.http.post<any>(`${this.api}/ReservaDetalle/${item.id}/desautorizar`, {}).subscribe({
      next: (r) => {
        if (r.success) {
          this.notify.showSuccess('Ítem rechazado y quitado de la lista.');
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
      const maximo = item.cantidadRestante || item.cantidad;
      if (valor > maximo) {
        this.notify.showWarning(`La cantidad no puede superar el stock disponible (${maximo}).`);
        valor = maximo;
      }
      if (valor <= 0) valor = 1;
    }
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




