import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Reporte`;

  descargarActaPrelacion(idCotizacion: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/licitaciones/${idCotizacion}/pdf`, {
      responseType: 'blob'
    });
  }

  descargarDetalleSubasta(idCotizacion: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/subastas/${idCotizacion}/detalle/pdf`, {
      responseType: 'blob'
    });
  }

  descargarProveedoresInvitados(idCotizacion: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/subastas/${idCotizacion}/proveedores-invitados/pdf`, {
      responseType: 'blob'
    });
  }

  descargarPreguntasRespuestas(idCotizacion: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/subastas/${idCotizacion}/preguntas-respuestas/pdf`, {
      responseType: 'blob'
    });
  }

  descargarDesistimiento(idCotizacion: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/subastas/${idCotizacion}/desistimiento/pdf`, {
      responseType: 'blob'
    });
  }

  descargarObservacionesProveedores(idCotizacion: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/subastas/${idCotizacion}/observaciones-proveedores/pdf`, {
      responseType: 'blob'
    });
  }
  descargarAuditoriaSubasta(idCotizacion: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/subastas/${idCotizacion}/auditoria/pdf`, {
      responseType: 'blob'
    });
  }

  descargarVerificacionDocumentacion(idCotizacion: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/subastas/${idCotizacion}/verificacion-documentacion/pdf`, {
      responseType: 'blob'
    });
  }

  abrirPdf(blob: Blob): void {
    const file = new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}


