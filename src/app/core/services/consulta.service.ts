import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Consulta {
  idMensaje: number;
  idCotizacion: number;
  idProveedor?: number;
  usuarioPregunta: string;
  pregunta: string;
  fechaPregunta: string;
  respuesta?: string;
  usuarioRespuesta?: string;
  fechaRespuesta?: string;
  respondida: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConsultaService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getConsultas(idCotizacion: number): Observable<any> {
    return this.http.get(`${this.api}/Cotizacion/${idCotizacion}/Consulta`);
  }

  preguntar(idCotizacion: number, contenido: string): Observable<any> {
    return this.http.post(`${this.api}/Cotizacion/${idCotizacion}/Consulta`, { contenido });
  }

  responder(idCotizacion: number, idMensaje: number, respuesta: string): Observable<any> {
    return this.http.put(`${this.api}/Cotizacion/${idCotizacion}/Consulta/${idMensaje}/Responder`, { respuesta });
  }
}