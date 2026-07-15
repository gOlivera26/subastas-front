import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { 
  NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, 
  ApexXAxis, ApexStroke, ApexDataLabels, ApexYAxis, ApexFill, 
  ApexTooltip, ApexTheme 
} from 'ng-apexcharts';
import { SignalRService } from '../../../core/services/signalr.service';
import { CotizacionService } from '../../../core/services/cotizacion.service';
import { MonedaService } from '../../../core/services/moneda.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TimeService } from '../../../core/services/time.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Modal } from '../../../shared/ui/modal/modal';
import { Moneda } from '../../../core/models/moneda.model';
import { environment } from '../../../../environments/environment';
import { ConfirmationService } from '../../../core/services/confirmation.service';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  yaxis: ApexYAxis;
  fill: ApexFill;
  colors: string[];
  tooltip: ApexTooltip;
  theme: ApexTheme;
  markers: any;
};

@Component({
  selector: 'app-subasta-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule, LoadingSpinnerComponent, Modal, NgApexchartsModule],
  templateUrl: './subasta-detalle.component.html',
})
export class SubastaDetalleComponent implements OnInit, OnDestroy {
  private confirmation = inject(ConfirmationService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  signalR = inject(SignalRService);
  private cotService = inject(CotizacionService);
  private monedaService = inject(MonedaService);
  public auth = inject(AuthService);
  private notify = inject(NotificationService);
  private timeService = inject(TimeService);
  
  api = `${environment.apiUrl}`;

  idCotizacion = signal<number>(0);
  subasta = signal<any | null>(null);
  monedas = signal<Moneda[]>([]);
  loading = signal(true);
  tick = signal(0);
  private timerInterval: any;

  ofertando = signal(false);
  showErroresPujaModal = signal(false);
  erroresPujaList = signal<{ item: string, error: string }[]>([]);

  haDesistido = signal(false);
  desistiendo = signal(false);
  
  proveedorId = computed(() => {
    const user: any = this.auth.currentUser();
    if (user && user.token) {
      try {
        const payload = JSON.parse(atob(user.token.split('.')[1]));
        return payload.IdProveedor ? Number(payload.IdProveedor) : 2;
      } catch (e) {
        return 2;
      }
    }
    return 2;
  });

  ofertasForm = signal<Record<number, any>>({});
  ofertas = computed(() => this.signalR.ofertas().filter(o => o.idCotizacion === this.idCotizacion()));

  ofertasOrdenadas = computed(() => {
    return [...this.ofertas()].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  });

  mejoresOfertas = computed(() => this.signalR.mejoresOfertas());
  
  // === TRADING CHART ===
  @ViewChild('chart') chart!: ChartComponent;
  feedView = signal<'LIST' | 'CHART'>('LIST'); 
  public chartOptions: Partial<ChartOptions>;

  get timeLeft(): string {
    const s = this.subasta();
    if (!s?.especificacion?.fechaFinalizacionSubasta) return '--:--:--';
    const diff = new Date(s.especificacion.fechaFinalizacionSubasta).getTime() - this.timeService.now();
    if (diff <= 0) return 'Finalizada';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  }

  get isLive(): boolean { 
    const s = this.subasta(); 
    if (!s?.especificacion?.fechaFinalizacionSubasta || s?.estado === 'Finalizada') return false; 
    return new Date(s.especificacion.fechaFinalizacionSubasta).getTime() - this.timeService.now() > 0; 
  }

  get isFinishingSoon(): boolean {
    const s = this.subasta();
    if (!s?.especificacion?.fechaFinalizacionSubasta || s?.estado === 'Finalizada') return false;
    const diff = new Date(s.especificacion.fechaFinalizacionSubasta).getTime() - this.timeService.now();
    return diff > 0 && diff <= 300000;
  }

  get isPorRenglon(): boolean { return this.subasta()?.especificacion?.criterioAdjudicacion === 1; }
  get isDirecta(): boolean { return this.subasta()?.idTipoContratacion === 9; }
  get requiereGestionDocumentacion(): boolean { return this.subasta()?.idTipoContratacion === 8 || this.subasta()?.especificacion?.gestionDocumentacion === true; }

  elementosOfertables = computed(() => {
    const s = this.subasta();
    if (!s) return [];
    return this.isPorRenglon ? (s.renglones || []) : (s.detalles || []);
  });

  getMejorOferta(idFila: number): number | null {
    const match = this.mejoresOfertas().find(o =>
      this.isPorRenglon ? o.idRenglon === idFila : o.idCotizacionDetalle === idFila
    );
    return match ? match.mejorMonto : null;
  }

  isGarantiasModalOpen = signal(false);
  garantiasList = signal<any[]>([]);
  savingGarantia = signal(false);
  
  garantiaForm = {
    idTipoDocumento: '0', 
    idMoneda: '0', 
    companiaAseguradora: '', 
    nroPoliza: '',
    montoCaucion: null as number | null, 
    observacion: '', 
    montoPagare: null as number | null,
    fechaPagare: '', 
    archivo: null as File | null
  };

  // Helper para desencapsular los valores numéricos extraños de la API
  getVal(campo: any): number {
    if (campo && campo.parsedValue !== undefined) return campo.parsedValue;
    return Number(campo) || 0;
  }

  constructor() {
    this.chartOptions = {
      series: [{ name: "Ofertas", data: [] }],
      chart: { 
        type: "area", 
        height: '100%', 
        background: 'transparent', 
        toolbar: { show: false }, 
        animations: { 
          enabled: true, 
          speed: 400,
          animateGradually: { enabled: true, delay: 50 },
          dynamicAnimation: { enabled: true, speed: 200 }
        } 
      },
      colors: [this.isDirecta ? '#02b8cc' : '#e4f222'],
      stroke: { curve: "straight", width: 3 },
      fill: { 
        type: "gradient", 
        gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] } 
      },
      dataLabels: { enabled: false },
      theme: { mode: 'dark' },
      xaxis: { 
        type: "datetime", 
        labels: { 
          style: { colors: '#8a8f98', fontFamily: 'Inter' }, 
          datetimeUTC: false,
          format: 'HH:mm:ss'
        }, 
        axisBorder: { show: false }, 
        axisTicks: { show: false } 
      },
      yaxis: { 
        labels: { 
          style: { colors: '#8a8f98', fontFamily: 'Inter' }, 
          formatter: (val) => "$" + val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
        } 
      },
      tooltip: {
        theme: "dark",
        x: { format: 'HH:mm:ss' },
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const point = w.config.series?.[seriesIndex]?.data?.[dataPointIndex] || {};
          const proveedor = point.proveedor ? `<div style="margin-top:4px;color:#8a8f98;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">${point.proveedor}</div>` : '';
          const representante = point.representante || point.usuario || `Proveedor #${point.idProveedor ?? ''}`;
          const monto = Number(point.y || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const fecha = point.x ? new Date(point.x).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

          return `
            <div style="padding:10px 12px;background:#1b1d22;border:1px solid #2b3038;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.35);">
              <div style="color:#8a8f98;font-size:11px;font-family:monospace;margin-bottom:6px;">${fecha}</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="width:9px;height:9px;border-radius:999px;background:${this.isDirecta ? '#02b8cc' : '#e4f222'};display:inline-block;"></span>
                <strong style="color:#f4f7fb;font-size:12px;">${representante}</strong>
              </div>
              ${proveedor}
              <div style="margin-top:8px;color:${this.isDirecta ? '#02b8cc' : '#e4f222'};font-family:monospace;font-weight:800;font-size:13px;">$${monto}</div>
            </div>`;
        }
      },
      markers: {
        size: 6,
        strokeColors: '#0B0E14',
        strokeWidth: 2,
        hover: { size: 9 },
        customHTML: () => {
          return `<div style="display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 40 40" style="width:16px; height:16px; color:${this.isDirecta ? '#02b8cc' : '#e4f222'}">
              <g transform="rotate(0 20 20)">
                <path fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round" d="M0,-8 L0.8,-3 L5.5,2 L5.5,3 L1.5,2.5 L1.2,5 L3.5,6.5 L3.5,7.5 L0,7 L-3.5,7.5 L-3.5,6.5 L-1.2,5 L-1.5,2.5 L-5.5,3 L-5.5,2 L-0.8,-3 Z"/>
              </g>
            </svg>
          </div>`;
        }
      }
    };

    effect(() => {
      const prorroga = this.signalR.prorrogaEvent();
      if (prorroga && prorroga.idCotizacion === this.idCotizacion()) {
        this.subasta.update(s => {
          if (!s) return s;
          if (s.especificacion?.fechaFinalizacionSubasta === prorroga.nuevaFechaFin) return s;
          
          return {
            ...s,
            especificacion: {
              ...s.especificacion,
              fechaFinalizacionSubasta: prorroga.nuevaFechaFin
            }
          };
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const pujas = this.ofertas();
      const mejores = this.mejoresOfertas();
      const elementos = this.elementosOfertables();
      if (elementos.length === 0) return;

      const margen = this.subasta()?.especificacion?.margenMejora || 5;
      
      const bestPerItem: Record<number, number> = {};
      elementos.forEach((el: any) => {
        const base = this.isPorRenglon ? (el._importeBaseConsolidado || 0) : this.getVal(el.importeBase);
        bestPerItem[this.isPorRenglon ? el.idRenglon : el.idCotizacionDetalle] = base;
      });

      mejores.forEach(m => {
        const idItem = m.idRenglon || m.idCotizacionDetalle;
        if (idItem && bestPerItem[idItem] !== undefined) {
          bestPerItem[idItem] = m.mejorMonto;
        }
      });

      const pujasOrdenadas = [...pujas].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      const dataPoints = pujasOrdenadas.map((puja) => ({
        x: new Date(puja.fecha).getTime(),
        y: puja.monto,
        idProveedor: puja.idProveedor,
        proveedor: puja.proveedor,
        representante: puja.representante,
        usuario: puja.usuario
      }));

      this.ofertasForm.update(state => {
        const newState = { ...state };
        elementos.forEach((el: any) => {
          const idItem = this.isPorRenglon ? el.idRenglon : el.idCotizacionDetalle;
          const mejorOferta = bestPerItem[idItem];
          
          const hasBids = mejores.some(m => (m.idRenglon || m.idCotizacionDetalle) === idItem);

          if (mejorOferta > 0 && newState[idItem]) {
            if (!hasBids) {
               newState[idItem].miImporte = mejorOferta;
            } else {
               if (this.isDirecta) {
                 newState[idItem].miImporte = Math.floor((mejorOferta + (mejorOferta * margen / 100)) * 100) / 100;
               } else {
                 newState[idItem].miImporte = Math.floor((mejorOferta - (mejorOferta * margen / 100)) * 100) / 100;
               }
            }
          }
        });
        return newState;
      });

      this.chartOptions.series = [{ name: 'Ofertas', data: dataPoints }];
      this.chartOptions.colors = [this.isDirecta ? '#02b8cc' : '#e4f222'];

    }, { allowSignalWrites: true });
  }

  async ngOnInit() {
    this.timeService.syncWithServer();
    this.timerInterval = setInterval(() => this.tick.update(v => v + 1), 1000);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.idCotizacion.set(id);

    this.loadMonedas();

    this.cotService.getById(id).subscribe({
      next: (r: any) => { 
        this.loading.set(false); 
        if (r?.success && r.data) { 
          this.subasta.set(r.data); 
          const miParticipacion = r.data.proveedores?.find((p: any) => p.idProveedor === this.proveedorId());
          if (miParticipacion && miParticipacion.ganadora === 'D') {
            this.haDesistido.set(true);
          }
          this.inicializarFormulario(r.data);
          this.cargarHistorialOfertas(id);
        } 
      },
      error: () => this.loading.set(false)
    });

    const token = this.auth.getToken();
    if (token) {
      await this.signalR.connect(token);
      await this.signalR.joinSubasta(id);

      this.signalR['connection']?.on('SubastaCerradaPorTope', (cerradaId: number) => {
        if (cerradaId === this.idCotizacion()) {
          this.notify.showWarning('La subasta ha finalizado porque se alcanzó el importe mínimo permitido.');
          
          this.subasta.update(s => {
            if (!s) return s;
            return {
              ...s,
              estado: 'Finalizada',
              idEstado: 40,
              especificacion: {
                ...s.especificacion,
                fechaFinalizacionSubasta: new Date(this.timeService.now()).toISOString()
              }
            };
          });
        }
      });
    }
  }

  loadMonedas() {
    this.monedaService.getAll().subscribe(res => {
      if (res.success && res.data) this.monedas.set(res.data);
    });
  }

  cargarHistorialOfertas(idCotizacion: number) {
    this.http.get<any>(`${this.api}/OfertaSubasta/${idCotizacion}`).subscribe({
      next: (res) => {
        const data = res.data || res;

        if (data.ofertas && data.ofertas.length > 0) {
          const mapeadas = data.ofertas.map((o: any) => ({
            idCotizacion: idCotizacion,
            idCotizacionDetalle: o.idCotizacionDetalle,
            idRenglon: o.idRenglon,
            monto: o.monto,
            idProveedor: o.idProveedor,
            fecha: o.fechaOferta,
            usuario: o.usuario || o.representante || o.proveedor || `Proveedor #${o.idProveedor}`,
            proveedor: o.proveedor,
            representante: o.representante
          }));
          this.signalR.ofertas.set(mapeadas);
        }

        if (data.mejoresOfertas && data.mejoresOfertas.length > 0) {
          const mapeadasMejores = data.mejoresOfertas.map((m: any) => ({
            idCotizacionDetalle: m.idCotizacionDetalle ?? m.IdCotizacionDetalle,
            idRenglon: m.idRenglon ?? m.IdRenglon,
            mejorMonto: m.mejorMonto ?? m.MejorMonto
          }));
          this.signalR.mejoresOfertas.set(mapeadasMejores);
        }
      }
    });
  }

  inicializarFormulario(data: any) {
    const formState: Record<number, any> = {};
    const isRenglon = data.especificacion?.criterioAdjudicacion === 1;
    const array = isRenglon ? (data.renglones || []) : (data.detalles || []);
    
    array.forEach((item: any) => {
      const id = isRenglon ? item.idRenglon : item.idCotizacionDetalle;
      
      let cantidadFila = 1;
      let importeBaseFila = 0;
      let descripcionLote = '';

      if (isRenglon) {
        const detallesDelRenglon = (data.detalles || []).filter((d: any) => d.idRenglon === id);
        cantidadFila = 1; 
        
        detallesDelRenglon.forEach((d: any) => {
          importeBaseFila += this.getVal(d.importeBase) * this.getVal(d.cantidad);
        });

        descripcionLote = detallesDelRenglon.map((d: any) => d.nItem).join(' + ');
        item._descripcionResumen = descripcionLote; 
        item._importeBaseConsolidado = importeBaseFila;
      } else {
        cantidadFila = this.getVal(item.cantidad);
        importeBaseFila = this.getVal(item.importeBase);
      }

      formState[id] = {
        miImporte: null,
        idMoneda: item.idMoneda || 1,
        ofertar: false,
        cantidad: cantidadFila,
        importeBase: importeBaseFila,
        textoError: null 
      };
    });
    this.ofertasForm.set(formState);
  }

  toggleOfertar(id: number, value: boolean) {
    this.ofertasForm.update(state => ({ ...state, [id]: { ...state[id], ofertar: value, textoError: null } }));
  }

  calcularTotalFila(id: number): number {
    const row = this.ofertasForm()[id];
    if (!row || !row.miImporte) return 0;
    return row.miImporte * row.cantidad;
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const id = this.idCotizacion();
    if (id) {
      this.signalR.leaveSubasta(id);
      this.signalR.clearOfertas();
    }
  }

  enviarOfertasSeleccionadas() {
    const state = this.ofertasForm();
    const isRenglon = this.isPorRenglon;
    
    const ofertasCandidatas = Object.keys(state)
      .map(id => Number(id))
      .filter(id => state[id].ofertar && state[id].miImporte > 0);

    if (ofertasCandidatas.length === 0) {
      this.notify.showWarning('No hay ofertas marcadas con "Sí" o con importes válidos.');
      return;
    }

    const ofertasAEnviar = ofertasCandidatas.map(id => ({
      idCotizacionDetalle: isRenglon ? null : id,
      idRenglon: isRenglon ? id : null,
      monto: state[id].miImporte,
      idMonedaOferta: state[id].idMoneda,
      cantidad: state[id].cantidad
    }));

    this.ofertando.set(true);

    this.http.post(`${this.api}/OfertaSubasta/${this.idCotizacion()}/Batch`, ofertasAEnviar).subscribe({
      next: (res: any) => {
        this.ofertando.set(false);
        if (res.success && res.data) {
          const resultados = res.data;
          let exitos = 0;
          const listaErrores: { item: string, error: string }[] = [];

          this.ofertasForm.update(st => {
            const newState = { ...st };
            resultados.forEach((r: any) => {
              const id = r.idCotizacionDetalle || r.idRenglon;
              
              if (r.textoError) {
                const nombreItem = this.elementosOfertables().find((e: any) => 
                  isRenglon ? e.idRenglon === id : e.idCotizacionDetalle === id
                )?.nItem || 'Ítem #' + id;

                listaErrores.push({ item: nombreItem, error: r.textoError });
                newState[id].textoError = r.textoError;
              } else {
                newState[id].miImporte = null;
                newState[id].ofertar = false;
                newState[id].textoError = null;
                exitos++;
              }
            });
            return newState;
          });

          if (exitos > 0) {
            this.notify.showSuccess(`¡Se registraron ${exitos} ofertas con éxito!`);
            this.feedView.set('CHART'); 
          }

          if (listaErrores.length > 0) {
            this.erroresPujaList.set(listaErrores);
            this.showErroresPujaModal.set(true);
          }
        }
      },
      error: (err) => {
        this.ofertando.set(false);
        if (err.status === 400 && err.error?.message) {
          const mensajeError = err.error.message;
          const listaErrores = ofertasCandidatas.map(id => {
            const nombreItem = this.elementosOfertables().find((e: any) => 
              isRenglon ? e.idRenglon === id : e.idCotizacionDetalle === id
            )?.nItem || 'Lote / Ítem';
            
            this.ofertasForm.update(st => {
              const newState = { ...st };
              if (newState[id]) newState[id].textoError = mensajeError;
              return newState;
            });

            return { item: nombreItem, error: mensajeError };
          });

          this.erroresPujaList.set(listaErrores);
          this.showErroresPujaModal.set(true);
        } else {
          this.notify.showError(err.error?.message || 'Error de red al procesar las ofertas.');
        }
      }
    });
  }

  // --- GARANTÍAS ---
  openGarantiasModal() { 
    this.cargarGarantias(); 
    this.resetGarantiaForm(); 
    this.isGarantiasModalOpen.set(true); 
  }

  closeGarantiasModal() { 
    this.isGarantiasModalOpen.set(false); 
  }

  resetGarantiaForm() { 
    this.garantiaForm = { 
      idTipoDocumento: '0', 
      idMoneda: '0', 
      companiaAseguradora: '', 
      nroPoliza: '', 
      montoCaucion: null, 
      observacion: '', 
      montoPagare: null, 
      fechaPagare: '', 
      archivo: null 
    }; 
  }
  
  cargarGarantias() { 
    this.cotService.getGarantias(this.idCotizacion()).subscribe({ 
      next: (res: any) => { 
        if (res.success && res.data) this.garantiasList.set(res.data); 
      },
      error: () => {
        this.garantiasList.set([]);
      }
    }); 
  }
  
  onFileGarantiaSelected(event: any) { 
    const file = event.target.files[0]; 
    if (file) { 
      if (file.size > 20 * 1024 * 1024) { this.notify.showError('El archivo supera los 20MB permitidos.'); return; } 
      this.garantiaForm.archivo = file; 
    } 
  }
  
  guardarGarantia() {
    const f = this.garantiaForm;
    
    const tipoDoc = Number(f.idTipoDocumento);
    const monedaId = Number(f.idMoneda);

    if (tipoDoc === 1 && (!f.companiaAseguradora || !f.montoCaucion || !f.nroPoliza || monedaId === 0)) { 
      this.notify.showWarning('Completá los datos obligatorios de la Póliza.'); 
      return; 
    }
    if (tipoDoc === 2 && (!f.montoPagare || !f.fechaPagare || monedaId === 0)) { 
      this.notify.showWarning('Completá los datos obligatorios del Pagaré.'); 
      return; 
    }
    if (!f.archivo) { 
      this.notify.showWarning('Debes adjuntar el archivo digitalizado.'); 
      return; 
    }

    this.savingGarantia.set(true);
    
    const formData = new FormData();
    formData.append('IdCotizacion', this.idCotizacion().toString());
    formData.append('IdProveedor', this.proveedorId().toString());
    formData.append('IdTipoDocumento', tipoDoc.toString());
    formData.append('IdMoneda', monedaId.toString());
    formData.append('Archivo', f.archivo);

    if (tipoDoc === 1) { 
      formData.append('CompaniaAseguradora', f.companiaAseguradora); 
      formData.append('NroPoliza', f.nroPoliza); 
      formData.append('MontoCaucion', f.montoCaucion ? f.montoCaucion.toString() : '0'); 
      if (f.observacion) formData.append('Observacion', f.observacion); 
      formData.append('MontoPagare', '0');
    } else { 
      formData.append('MontoPagare', f.montoPagare ? f.montoPagare.toString() : '0'); 
      formData.append('FechaPagare', f.fechaPagare); 
      formData.append('CompaniaAseguradora', '');
      formData.append('NroPoliza', '');
      formData.append('MontoCaucion', '0');
    }

    this.cotService.crearGarantia(formData).subscribe({
      next: (res: any) => { 
        this.savingGarantia.set(false); 
        if (res.success) { 
          this.notify.showSuccess('Garantía guardada.'); 
          this.resetGarantiaForm(); 
          this.cargarGarantias(); 
        } else { 
          this.notify.showError(res.message || 'Error al guardar.'); 
        } 
      },
      error: (err) => { 
        this.savingGarantia.set(false); 
        this.notify.showError(err.error?.message || 'Error de servidor al subir archivo.'); 
      }
    });
  }

  async eliminarGarantia(id: number) {
    if (!(await this.confirmation.confirm({ title: 'Eliminar garantía', message: '¿Eliminar garantía?', confirmText: 'Eliminar', type: 'danger' }))) return;
    this.cotService.eliminarGarantia(id).subscribe({ 
      next: (res: any) => { 
        if (res.success) { 
          this.notify.showSuccess('Garantía eliminada.'); 
          this.cargarGarantias(); 
        } 
      },
      error: (err) => {
        this.notify.showError(err.error?.message || 'No se pudo eliminar la garantía.');
      }
    });
  }

  closeErroresPujaModal() {
    this.showErroresPujaModal.set(false);
    this.erroresPujaList.set([]);
  }

  async desistirDeSubasta() {
  if (!(await this.confirmation.confirm({ title: 'Desistir de la subasta', message: '¿Estás seguro de que deseas desistir de esta subasta? Ya no podrás enviar ofertas.', confirmText: 'Desistir', type: 'warning' }))) return;
  
  this.desistiendo.set(true);
  this.cotService.desistirParticipacion(this.idCotizacion()).subscribe({
    next: (res) => {
      this.desistiendo.set(false);
      if (res.success) {
        this.haDesistido.set(true);
        this.notify.showSuccess('Has desistido de la subasta exitosamente.');
      } else {
        this.notify.showError(res.message || 'Error al intentar desistir.');
      }
    },
    error: (err) => {
      this.desistiendo.set(false);
      this.notify.showError(err.error?.message || 'Error de conexión.');
    }
  });
}
}


