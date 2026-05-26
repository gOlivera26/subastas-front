import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';

export interface SubastaDashboard {
  idCotizacion: number;
  idEstado: number;
  nroCotizacion: string;
  tipo: string;
  estado: string;
  titulo: string;
  unidadAdm?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Cotizacion`;

  getEnCurso(idVigencia?: number): Observable<OperationResponse<SubastaDashboard[]>> {
    return this.http.get<OperationResponse<SubastaDashboard[]>>(`${this.apiUrl}/dashboard/en-curso`, { params: idVigencia ? { idVigencia } : {} });
  }

  getProximas(idVigencia?: number): Observable<OperationResponse<SubastaDashboard[]>> {
    return this.http.get<OperationResponse<SubastaDashboard[]>>(`${this.apiUrl}/dashboard/proximas`, { params: idVigencia ? { idVigencia } : {} });
  }

  getDelMes(idVigencia?: number): Observable<OperationResponse<SubastaDashboard[]>> {
    return this.http.get<OperationResponse<SubastaDashboard[]>>(`${this.apiUrl}/dashboard/del-mes`, { params: idVigencia ? { idVigencia } : {} });
  }

  getAll(idVigencia?: number): Observable<OperationResponse<SubastaDashboard[]>> {
    let p: any = {};
    if (idVigencia != null) p['idVigencia'] = idVigencia;
    return this.http.get<OperationResponse<SubastaDashboard[]>>(this.apiUrl, { params: p });
  }

  buscar(filtros: { idVigencia?: number; idEstado?: number; nro?: string; expte?: string; fechaDesde?: string }): Observable<OperationResponse<SubastaDashboard[]>> {
    const p: any = {};
    if (filtros.idVigencia != null) p['idVigencia'] = filtros.idVigencia;
    if (filtros.idEstado != null) p['idEstado'] = filtros.idEstado;
    if (filtros.nro) p['nro'] = filtros.nro;
    if (filtros.expte) p['expte'] = filtros.expte;
    if (filtros.fechaDesde) p['fechaDesde'] = filtros.fechaDesde;
    return this.http.get<OperationResponse<SubastaDashboard[]>>(`${this.apiUrl}/buscar`, { params: p });
  }

  getById(id: number): Observable<OperationResponse<SubastaDashboard>> {
    return this.http.get<OperationResponse<SubastaDashboard>>(`${this.apiUrl}/${id}`);
  }
}
