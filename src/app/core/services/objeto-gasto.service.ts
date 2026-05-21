import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';
import { ObjetoGasto } from '../models/objeto-gasto.model';

export interface ObjetoGastoRequest {
  idObjetoGastoRel?: number;
  numeroObjeto: string;
  nombreObjeto: string;
  idVigencia: number;
  idOrganizacion?: number;
  imputaEjecucion?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ObjetoGastoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ObjetoGasto`;

  getAll(idVigencia?: number): Observable<OperationResponse<ObjetoGasto[]>> {
    let url = this.apiUrl;
    if (idVigencia != null) url += `?idVigencia=${idVigencia}`;
    return this.http.get<OperationResponse<ObjetoGasto[]>>(url);
  }

  create(data: ObjetoGastoRequest): Observable<OperationResponse<ObjetoGasto>> {
    return this.http.post<OperationResponse<ObjetoGasto>>(this.apiUrl, data);
  }

  update(id: number, data: ObjetoGastoRequest): Observable<OperationResponse<ObjetoGasto>> {
    return this.http.put<OperationResponse<ObjetoGasto>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`);
  }
}
