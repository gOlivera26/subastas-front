import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
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

@Component({
  selector: 'app-subasta-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule, LoadingSpinnerComponent, Modal],
  templateUrl: './subasta-detalle.component.html',
})
export class SubastaDetalleComponent implements OnInit, OnDestroy {
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
  
  proveedorId = computed(() => {
    const user = this.auth.currentUser();
    return (user as any)?.idProveedor || (user as any)?.idEntidad || 1; 
  });

  ofertasForm = signal<Record<number, any>>({});

  ofertas = computed(() => this.signalR.ofertas().filter(o => o.idCotizacion === this.idCotizacion()));
  
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

  get isPorRenglon(): boolean { return this.subasta()?.especificacion?.criterioAdjudicacion === 1; }
  
  // GETTER FASE 1: SUBASTA DIRECTA
  get isDirecta(): boolean { return this.subasta()?.idTipoContratacion === 9; }

  elementosOfertables = computed(() => {
    const s = this.subasta();
    if (!s) return [];
    return this.isPorRenglon ? (s.renglones || []) : (s.detalles || []);
  });

  getMejorOferta(idFila: number): number | null {
    const pujas = this.ofertas().filter(o => 
      this.isPorRenglon ? o.idRenglon === idFila : o.idCotizacionDetalle === idFila
    );
    if (pujas.length === 0) return null;
    
    if (this.isDirecta) {
      return Math.max(...pujas.map(p => p.monto)); // Directa: La mejor es la más alta
    } else {
      return Math.min(...pujas.map(p => p.monto)); // Inversa: La mejor es la más baja
    }
  }

  isGarantiasModalOpen = signal(false);
  garantiasList = signal<any[]>([]);
  savingGarantia = signal(false);
  garantiaForm = {
    idTipoDocumento: 0, idMoneda: 0, companiaAseguradora: '', nroPoliza: '',
    montoCaucion: null as number | null, observacion: '', montoPagare: null as number | null,
    fechaPagare: '', archivo: null as File | null
  };

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
    }
  }

  loadMonedas() {
    this.monedaService.getAll().subscribe(res => {
      if (res.success && res.data) this.monedas.set(res.data);
    });
  }

  cargarHistorialOfertas(idCotizacion: number) {
    this.http.get<any[]>(`${this.api}/OfertaSubasta/${idCotizacion}`).subscribe({
      next: (ofertasHistorial) => {
        if (ofertasHistorial && ofertasHistorial.length > 0) {
          const mapeadas = ofertasHistorial.map(o => ({
            idCotizacion: idCotizacion,
            idCotizacionDetalle: o.idCotizacionDetalle,
            idRenglon: o.idRenglon,
            monto: o.monto,
            idProveedor: o.idProveedor,
            fecha: o.fechaOferta,
            usuario: 'Historial'
          }));
          this.signalR.ofertas.update(arr => [...arr, ...mapeadas]);
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
      formState[id] = {
        miImporte: null,
        idMoneda: 1, // Por defecto Peso Argentino
        ofertar: false,
        cantidad: isRenglon ? 1 : item.cantidad,
        importeBase: item.importeBase || 0
      };
    });
    this.ofertasForm.set(formState);
  }

  toggleOfertar(id: number, value: boolean) {
    this.ofertasForm.update(state => ({ ...state, [id]: { ...state[id], ofertar: value } }));
  }

  calcularTotalFila(id: number): number {
    const row = this.ofertasForm()[id];
    if (!row || !row.miImporte) return 0;
    return row.miImporte * row.cantidad;
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const id = this.idCotizacion();
    if (id) this.signalR.leaveSubasta(id);
  }

  enviarOfertasSeleccionadas() {
    const estado = this.ofertasForm();
    const isRenglon = this.isPorRenglon;
    const margen = this.subasta()?.especificacion?.margenMejora || 0;
    
    const ofertasCandidatas = Object.keys(estado)
      .map(id => Number(id))
      .filter(id => estado[id].ofertar && estado[id].miImporte > 0);

    if (ofertasCandidatas.length === 0) {
      this.notify.showWarning('No hay ofertas marcadas con "Sí" o con importes válidos.');
      return;
    }

    // VALIDACIÓN DE MARGEN DE MEJORA BIFURCADA (FASE 2)
    const ofertasInvalidas: string[] = [];
    const ofertasAEnviar: any[] = [];

    ofertasCandidatas.forEach(id => {
      const miMonto = estado[id].miImporte;
      const mejorOfertaActual = this.getMejorOferta(id);
      const precioBase = estado[id].importeBase;
      
      const precioACompetir = mejorOfertaActual !== null ? mejorOfertaActual : precioBase;

      if (this.isDirecta) {
        // SUBASTA DIRECTA: Puja hacia ARRIBA. Debe ser MAYOR o IGUAL al precioACompetir + margen
        const topeMinimoPermitido = precioACompetir + (precioACompetir * (margen / 100));
        if (miMonto < topeMinimoPermitido) {
          ofertasInvalidas.push(`Ítem #${id} (Mín: $${topeMinimoPermitido.toFixed(2)})`);
        } else {
          ofertasAEnviar.push({
            idCotizacion: this.idCotizacion(),
            idProveedor: this.proveedorId(),
            idCotizacionDetalle: isRenglon ? null : id,
            idRenglon: isRenglon ? id : null,
            monto: miMonto,
            idMoneda: estado[id].idMoneda
          });
        }
      } else {
        // SUBASTA INVERSA: Puja hacia ABAJO. Debe ser MENOR o IGUAL al precioACompetir - margen
        const topeMaximoPermitido = precioACompetir - (precioACompetir * (margen / 100));
        if (miMonto > topeMaximoPermitido) {
          ofertasInvalidas.push(`Ítem #${id} (Máx: $${topeMaximoPermitido.toFixed(2)})`);
        } else {
          ofertasAEnviar.push({
            idCotizacion: this.idCotizacion(),
            idProveedor: this.proveedorId(),
            idCotizacionDetalle: isRenglon ? null : id,
            idRenglon: isRenglon ? id : null,
            monto: miMonto,
            idMoneda: estado[id].idMoneda
          });
        }
      }
    });

    if (ofertasInvalidas.length > 0) {
      const palabra = this.isDirecta ? 'superar' : 'mejorar (reducir)';
      this.notify.showError(`Las ofertas deben ${palabra} el precio actual por al menos un ${margen}%. Revisa: ${ofertasInvalidas.join(', ')}`);
      return;
    }

    this.ofertando.set(true);

    let promesas = ofertasAEnviar.map(oferta => 
      new Promise((resolve, reject) => {
        this.http.post(`${this.api}/OfertaSubasta`, oferta).subscribe({
          next: (res: any) => resolve(res),
          error: (err: any) => reject(err)
        });
      })
    );

    Promise.all(promesas).then(resultados => {
      this.ofertando.set(false);
      const exitos = resultados.filter((r: any) => r?.idOfertaSubasta).length;
      if (exitos > 0) {
        this.notify.showSuccess(`¡Oferta registrada y guardada exitosamente!`);
        this.ofertasForm.update(st => {
          const newState = { ...st };
          ofertasAEnviar.forEach(o => {
            const id = o.idCotizacionDetalle || o.idRenglon;
            newState[id].miImporte = null;
            newState[id].ofertar = false;
          });
          return newState;
        });
      }
    }).catch(() => {
      this.ofertando.set(false);
      this.notify.showError('Error de red al registrar la oferta en la base de datos.');
    });
  }

  openGarantiasModal() { this.cargarGarantias(); this.resetGarantiaForm(); this.isGarantiasModalOpen.set(true); }
  closeGarantiasModal() { this.isGarantiasModalOpen.set(false); }
  resetGarantiaForm() { this.garantiaForm = { idTipoDocumento: 0, idMoneda: 0, companiaAseguradora: '', nroPoliza: '', montoCaucion: null, observacion: '', montoPagare: null, fechaPagare: '', archivo: null }; }
  cargarGarantias() { this.cotService.getGarantias(this.idCotizacion()).subscribe({ next: (res: any) => { if (res.success) this.garantiasList.set(res.data); } }); }
  onFileGarantiaSelected(event: any) { const file = event.target.files[0]; if (file) { if (file.size > 20 * 1024 * 1024) { this.notify.showError('El archivo supera los 20MB permitidos.'); return; } this.garantiaForm.archivo = file; } }
  
  guardarGarantia() {
    const f = this.garantiaForm;
    if (f.idTipoDocumento === 1 && (!f.companiaAseguradora || !f.montoCaucion || !f.nroPoliza || f.idMoneda == 0)) { this.notify.showWarning('Completá los datos obligatorios de la Póliza.'); return; }
    if (f.idTipoDocumento === 2 && (!f.montoPagare || !f.fechaPagare || f.idMoneda == 0)) { this.notify.showWarning('Completá los datos obligatorios del Pagaré.'); return; }
    if (!f.archivo) { this.notify.showWarning('Debes adjuntar el archivo digitalizado.'); return; }

    this.savingGarantia.set(true);
    const formData = new FormData();
    formData.append('IdCotizacion', this.idCotizacion().toString());
    formData.append('IdProveedor', this.proveedorId().toString());
    formData.append('IdTipoDocumento', f.idTipoDocumento.toString());
    formData.append('IdMoneda', f.idMoneda.toString());
    formData.append('Archivo', f.archivo);

    if (f.idTipoDocumento === 1) { formData.append('CompaniaAseguradora', f.companiaAseguradora); formData.append('NroPoliza', f.nroPoliza); formData.append('MontoCaucion', f.montoCaucion!.toString()); if (f.observacion) formData.append('Observacion', f.observacion); } 
    else { formData.append('MontoPagare', f.montoPagare!.toString()); formData.append('FechaPagare', f.fechaPagare); }

    this.cotService.crearGarantia(formData).subscribe({
      next: (res: any) => { this.savingGarantia.set(false); if (res.success) { this.notify.showSuccess('Garantía guardada.'); this.resetGarantiaForm(); this.cargarGarantias(); } else { this.notify.showError(res.message || 'Error al guardar.'); } },
      error: () => { this.savingGarantia.set(false); this.notify.showError('Error de servidor al subir archivo.'); }
    });
  }

  eliminarGarantia(id: number) {
    if (!confirm('¿Eliminar garantía?')) return;
    this.cotService.eliminarGarantia(id).subscribe({ next: (res: any) => { if (res.success) { this.notify.showSuccess('Garantía eliminada.'); this.cargarGarantias(); } } });
  }
}