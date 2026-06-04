import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { AuthService } from '../../../core/services/auth.service';
import { Vigencia } from '../../../core/models/vigencia.model';
import { TimeService } from '../../../core/services/time.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { ConsultaService } from '../../../core/services/consulta.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Modal } from '../../../shared/ui/modal/modal';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmationModal } from '../../../shared/ui/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-subastas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, Modal, LoadingSpinnerComponent, ConfirmationModal],
  templateUrl: './subastas.component.html',
})
export class SubastasComponent implements OnInit {
  private cotizacionService = inject(CotizacionService);
  private vigenciaService = inject(VigenciaService);
  private router = inject(Router);
  public auth = inject(AuthService);
  private timeService = inject(TimeService);
  
  // Inyecciones para el Foro de Consultas
  private signalR = inject(SignalRService);
  private consultaService = inject(ConsultaService);
  private notify = inject(NotificationService);

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

  // === ESTADOS DEL MODAL DE CONSULTAS ===
  isConsultasModalOpen = signal(false);
  activeCotizacionId = signal<number | null>(null);
  nuevaPregunta = signal('');
  
  respuestaTexto: Record<number, string> = {}; 
  
  enviandoConsulta = signal(false);

  // === ESTADOS DEL MODAL DE DOCUMENTACION POR ITEM ===
  showDocItemModal = signal(false);
  docItemCotizacion = signal<any>(null);
  docItemElementos = signal<any[]>([]);
  docItemArchivos = signal<any[]>([]);
  loadingDocItem = signal(false);
  savingDocItem = signal(false);
  docItemFile = signal<Record<number, File | null>>({});

  // Señales para los modales de confirmación
  docItemToDelete = signal<number | null>(null);
  docItemToSubmit = signal<any>(null);

  // Computeds del Foro
  isAdmin = computed(() => {
    const user: any = this.auth.currentUser();
    if (!user) return false;
    return user.idRol === 1 || 
           user.roles?.some((r: any) => r.rolId === 1 || r.rolId === 5) || 
           this.auth.isSuperAdmin();
  });

  currentProviderId = computed(() => {
    const user: any = this.auth.currentUser();
    if (user && user.token) {
      try {
        const payload = JSON.parse(atob(user.token.split('.')[1]));
        return payload.IdProveedor ? Number(payload.IdProveedor) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  consultas = computed(() => this.signalR.consultas());

  ngOnInit() {
    this.timeService.syncWithServer();
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
    return this.timeService.now();
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
    this.notify.showInfo(`Acción '${nombre}' en desarrollo.`);
  }

  // ==========================================
  // LOGICA DEL FORO DE CONSULTAS Y ACLARACIONES
  // ==========================================
  async abrirModalConsultas(idCotizacion: number) {
    this.activeCotizacionId.set(idCotizacion);
    this.isConsultasModalOpen.set(true);
    this.nuevaPregunta.set('');
    this.respuestaTexto = {}; 
    this.signalR.consultas.set([]); 
    
    this.consultaService.getConsultas(idCotizacion).subscribe(res => {
      if (res.success && res.data) {
        this.signalR.consultas.set(res.data);
      }
    });

    const token = this.auth.getToken();
    if (token) {
      await this.signalR.connect(token);
      await this.signalR.joinChat(idCotizacion);
    }
  }

  async cerrarModalConsultas() {
    this.isConsultasModalOpen.set(false);
    const id = this.activeCotizacionId();
    if (id) {
      await this.signalR.leaveChat(id);
    }
    this.activeCotizacionId.set(null);
  }

  enviarPregunta() {
    const id = this.activeCotizacionId();
    const texto = this.nuevaPregunta().trim();
    if (!id || !texto) return;

    this.enviandoConsulta.set(true);
    this.consultaService.preguntar(id, texto).subscribe({
      next: (res: any) => {
        this.enviandoConsulta.set(false);
        if (res.success) {
          this.nuevaPregunta.set('');
          this.notify.showSuccess('Pregunta enviada. El organismo ha sido notificado.');
        } else {
          this.notify.showError(res.message);
        }
      },
      error: (err) => {
        this.enviandoConsulta.set(false);
        this.notify.showError(err.error?.message || 'Error al enviar pregunta.');
      }
    });
  }

  responderPregunta(idMensaje: number) {
    const id = this.activeCotizacionId();
    const texto = this.respuestaTexto[idMensaje]?.trim();
    if (!id || !texto) return;

    this.consultaService.responder(id, idMensaje, texto).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notify.showSuccess('Respuesta publicada correctamente.');
          delete this.respuestaTexto[idMensaje]; 
        } else {
          this.notify.showError(res.message);
        }
      },
      error: (err) => {
        this.notify.showError(err.error?.message || 'Error al responder.');
      }
    });
  }

  // ==========================================
  // LÓGICA DE PLIEGOS Y DICTÁMENES
  // ==========================================
  showDictamen = signal(false); dictamenItem = signal<any>(null);
  dictamenForm = { tipo: '', archivo: null as File | null };
  savingDictamen = signal(false); dictamenList = signal<any[]>([]);

  showPliegos = signal(false); pliegoItem = signal<any>(null);
  
  getTipoDocumentoLabel(tipo: string): string {
    const tipos: Record<string, string> = {
      'S/D': 'Pliego',
      'DIC': 'Dictamen',
      'ANX': 'Informe',
      'ANT': 'Informe Técnico / Acta de Evaluación Técnica',
      'INS': 'Notas Aclaratorias',
      'ACT': 'Acta de Adjudicación',
      'ACP': 'Acta de Preadjudicación',
      'ASE': 'Asesoramiento',
      'RES': 'Resolución',
      'REF': 'Resolución Final'
    };
    return tipos[tipo] || tipo;
  }

  cargarDocumentos(idCotizacion: number) {
    this.cotizacionService.getDocumentos(idCotizacion).subscribe({
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

  openDictamen(item: any) {
    this.dictamenItem.set(item);
    this.dictamenForm = { tipo: '', archivo: null };
    this.dictamenList.set([]); 
    this.showDictamen.set(true);
    this.cargarDocumentos(item.idCotizacion);
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

    this.cotizacionService.subirDocumento(this.dictamenItem().idCotizacion, formData).subscribe({
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

  eliminarDictamen(idDocumento: number) {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.')) return;
    
    this.cotizacionService.eliminarDocumento(this.dictamenItem().idCotizacion, idDocumento).subscribe({
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

  openPliegos(item: any) { 
    this.pliegoItem.set(item); 
    this.dictamenList.set([]);
    this.showPliegos.set(true); 
    this.cargarDocumentos(item.idCotizacion);
  }
  closePliegos() { this.showPliegos.set(false); }

  // ==========================================
  // LÓGICA DE DOCUMENTACIÓN POR ÍTEM/RENGLÓN
  // ==========================================

  openCargarDocumentacionItem(item: any) {
    this.docItemCotizacion.set(item);
    this.showDocItemModal.set(true);
    this.cargarItemsYDocumentos(item.idCotizacion);
  }

  closeDocItemModal() {
    this.showDocItemModal.set(false);
    this.docItemCotizacion.set(null);
    this.docItemElementos.set([]);
    this.docItemArchivos.set([]);
    this.docItemFile.set({});
  }

  cargarItemsYDocumentos(idCotizacion: number) {
    this.loadingDocItem.set(true);
    
    this.cotizacionService.getById(idCotizacion).subscribe({
      next: (resSubasta: any) => {
        if (resSubasta.success && resSubasta.data) {
           const isRenglon = resSubasta.data.especificacion?.criterioAdjudicacion === 1;
           const elementos = isRenglon ? resSubasta.data.renglones : resSubasta.data.detalles;
           
           this.docItemElementos.set(elementos.map((e: any) => ({
              ...e,
              isRenglon: isRenglon,
              idElemento: isRenglon ? e.idRenglon : e.idCotizacionDetalle,
              nombreDisplay: isRenglon ? e.descripcion : e.nItem
           })));

           this.cotizacionService.getDocumentosItem(idCotizacion).subscribe({
             next: (resDocs: any) => {
               this.loadingDocItem.set(false);
               if (resDocs.success && resDocs.data) {
                 this.docItemArchivos.set(resDocs.data);
               }
             },
             error: () => this.loadingDocItem.set(false)
           });
        } else {
           this.loadingDocItem.set(false);
        }
      },
      error: () => {
        this.loadingDocItem.set(false);
        this.notify.showError('Error al cargar la información de la subasta.');
      }
    });
  }

  getArchivosPorElemento(idElemento: number, isRenglon: boolean) {
    return this.docItemArchivos().filter(d => isRenglon ? d.idRenglon === idElemento : d.idCotizacionDetalle === idElemento);
  }

  yaEnviadoDefinitivo(idElemento: number, isRenglon: boolean): boolean {
    const archivos = this.getArchivosPorElemento(idElemento, isRenglon);
    return archivos.some(a => a.enviado === true);
  }

  onFileDocItemSelected(event: any, idElemento: number) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { 
        this.notify.showError('El archivo supera los 20MB permitidos.'); 
        return; 
      }
      this.docItemFile.update(state => ({ ...state, [idElemento]: file }));
    }
  }

  subirDocumentoItem(elemento: any) {
    const file = this.docItemFile()[elemento.idElemento];
    if (!file) return;

    this.savingDocItem.set(true);
    const formData = new FormData();
    formData.append('Archivo', file);
    if (elemento.isRenglon) {
      formData.append('IdRenglon', elemento.idElemento.toString());
    } else {
      formData.append('IdCotizacionDetalle', elemento.idElemento.toString());
    }

    this.cotizacionService.subirDocumentoItem(this.docItemCotizacion().idCotizacion, formData).subscribe({
      next: (res: any) => {
        this.savingDocItem.set(false);
        if (res.success) {
          this.notify.showSuccess('Documento subido correctamente.');
          this.docItemFile.update(state => ({ ...state, [elemento.idElemento]: null }));
          this.cargarItemsYDocumentos(this.docItemCotizacion().idCotizacion);
        } else {
          this.notify.showError(res.message || 'Error al subir documento.');
        }
      },
      error: (err) => {
        this.savingDocItem.set(false);
        this.notify.showError(err.error?.message || 'Error al procesar la subida.');
      }
    });
  }

  eliminarDocumentoItem(idDocItem: number) {
    this.docItemToDelete.set(idDocItem);
  }

  confirmEliminarDocumentoItem() {
    const idDocItem = this.docItemToDelete();
    if (!idDocItem) return;

    this.cotizacionService.eliminarDocumentoItem(this.docItemCotizacion().idCotizacion, idDocItem).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notify.showSuccess('Documento eliminado.');
          this.cargarItemsYDocumentos(this.docItemCotizacion().idCotizacion);
        } else {
          this.notify.showError(res.message);
        }
        this.docItemToDelete.set(null);
      },
      error: () => {
        this.notify.showError('Error al eliminar el documento.');
        this.docItemToDelete.set(null);
      }
    });
  }

  enviarDocumentacionDefinitiva(elemento: any) {
    this.docItemToSubmit.set(elemento);
  }

  confirmEnviarDocumentacionDefinitiva() {
    const elemento = this.docItemToSubmit();
    if (!elemento) return;
    
    this.savingDocItem.set(true);
    const idCot = this.docItemCotizacion().idCotizacion;
    const idCotDet = !elemento.isRenglon ? elemento.idElemento : undefined;
    const idRenglon = elemento.isRenglon ? elemento.idElemento : undefined;

    this.cotizacionService.enviarDocumentacionItemDefinitiva(idCot, idCotDet, idRenglon).subscribe({
      next: (res: any) => {
        this.savingDocItem.set(false);
        if (res.success) {
          this.notify.showSuccess('Documentación enviada definitivamente.');
          this.cargarItemsYDocumentos(idCot);
        } else {
          this.notify.showError(res.message);
        }
        this.docItemToSubmit.set(null);
      },
      error: (err) => {
        this.savingDocItem.set(false);
        this.notify.showError(err.error?.message || 'Error al enviar documentación.');
        this.docItemToSubmit.set(null);
      }
    });
  }
}