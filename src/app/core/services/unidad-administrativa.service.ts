import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';
import { UnidadAdministrativa } from '../models/unidad-administrativa.model';

export interface UnidadAdministrativaRequest {
  numeroUnidadAdm: number;
  nombreUnidadAdm: string;
  idVigencia: number;
  idOrganizacion?: number;
  mail?: string;
  alias?: string;
  puerto?: number;
  smtp?: string;
}

@Injectable({ providedIn: 'root' })
export class UnidadAdministrativaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/UnidadAdministrativa`;

  getByVigencia(idVigencia: number): Observable<OperationResponse<UnidadAdministrativa[]>> {
    return this.http.get<OperationResponse<UnidadAdministrativa[]>>(`${this.apiUrl}/vigencia/${idVigencia}`);
  }

  getAll(): Observable<OperationResponse<UnidadAdministrativa[]>> {
    return this.http.get<OperationResponse<UnidadAdministrativa[]>>(this.apiUrl);
  }

  getById(id: number): Observable<OperationResponse<UnidadAdministrativa>> {
    return this.http.get<OperationResponse<UnidadAdministrativa>>(`${this.apiUrl}/${id}`);
  }

  create(data: UnidadAdministrativaRequest): Observable<OperationResponse<UnidadAdministrativa>> {
    return this.http.post<OperationResponse<UnidadAdministrativa>>(`${this.apiUrl}`, data);
  }

  update(id: number, data: UnidadAdministrativaRequest): Observable<OperationResponse<UnidadAdministrativa>> {
    return this.http.put<OperationResponse<UnidadAdministrativa>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`);
  }
}
