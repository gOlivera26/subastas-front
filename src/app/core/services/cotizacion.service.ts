import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';

export interface SubastaDashboard {
  idCotizacion: number;
  idEstado: number;
  nroCotizacion: string;
  idTipoContratacion: number;
  tipoContratacion: string;
  tipo: string;
  estado: string;
  titulo: string;
  unidadAdm?: string;
  objetoContratacion?: string;
  criterioAdjudicacion?: number; // 0 = Item, 1 = Renglon
  redeterminacion?: string; // 1=Publica, 0=Privada, 2=Cerrada
  fechaInicio?: string;
  fechaFin?: string;
  fechaConsulta?: string;
  fechaFinSubasta?: string;
  verInformeFinal?: boolean;
  mostrarBotonMejora?: boolean;
  tipoSobre?: string;
  fechaLimiteImpugnar?: string;
  fechaAperturaSobreUno?: string;
  fechaAperturaSobreDos?: string;
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

  buscar(filtros: {
    idVigencia?: number;
    idEstado?: number;
    idTipoContratacion?: number;
    nro?: string;
    expte?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<OperationResponse<SubastaDashboard[]>> {
    const p: any = {};
    if (filtros.idVigencia != null) p['idVigencia'] = filtros.idVigencia;
    if (filtros.idEstado != null) p['idEstado'] = filtros.idEstado;
    if (filtros.idTipoContratacion != null) p['idTipoContratacion'] = filtros.idTipoContratacion;
    if (filtros.nro) p['nro'] = filtros.nro;
    if (filtros.expte) p['expte'] = filtros.expte;
    if (filtros.fechaDesde) p['fechaDesde'] = filtros.fechaDesde;
    if (filtros.fechaHasta) p['fechaHasta'] = filtros.fechaHasta;
    return this.http.get<OperationResponse<SubastaDashboard[]>>(`${this.apiUrl}/buscar`, { params: p });
  }

  getById(id: number): Observable<OperationResponse<SubastaDashboard>> {
    return this.http.get<OperationResponse<SubastaDashboard>>(`${this.apiUrl}/${id}`);
  }

  getGarantias(idCotizacion: number): Observable<OperationResponse<any[]>> {
    return this.http.get<OperationResponse<any[]>>(`${environment.apiUrl}/Garantia/${idCotizacion}`);
  }

  crearGarantia(formData: FormData): Observable<OperationResponse<any>> {
    return this.http.post<OperationResponse<any>>(`${environment.apiUrl}/Garantia`, formData);
  }

  eliminarGarantia(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${environment.apiUrl}/Garantia/${id}`);
  }
}
