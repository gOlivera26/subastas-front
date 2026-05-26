import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';

export interface SubastaDashboard {
  idCotizacion: number;
  nroCotizacion: string;
  tipo: string;
  estado: string;
  titulo: string;
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

  getById(id: number): Observable<OperationResponse<SubastaDashboard>> {
    return this.http.get<OperationResponse<SubastaDashboard>>(`${this.apiUrl}/${id}`);
  }
}
