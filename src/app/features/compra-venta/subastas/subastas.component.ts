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

@Component({
  selector: 'app-subastas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, Modal],
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

  // Computeds del Foro
  isAdmin = computed(() => {
    const user: any = this.auth.currentUser();
    if (!user) return false;
    // Soporta tu nuevo SuperAdmin (idRol = 1 o la funcion isSuperAdmin) y el Legacy (5)
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
    this.respuestaTexto = {}; // Limpiamos el objeto
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
    const texto = this.respuestaTexto[idMensaje]?.trim(); // Leemos del objeto normal
    if (!id || !texto) return;

    this.consultaService.responder(id, idMensaje, texto).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.notify.showSuccess('Respuesta publicada correctamente.');
          delete this.respuestaTexto[idMensaje]; // Limpiamos el input
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

  // Vista de solo lectura (Proveedores)
  openPliegos(item: any) { 
    this.pliegoItem.set(item); 
    this.dictamenList.set([]);
    this.showPliegos.set(true); 
    this.cargarDocumentos(item.idCotizacion);
  }
  closePliegos() { this.showPliegos.set(false); }

}