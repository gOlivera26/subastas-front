import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';
import { Vigencia } from '../models/vigencia.model';

export interface VigenciaRequest {
  ejercicio: number;
  activoEjecucion: boolean;
}

@Injectable({ providedIn: 'root' })
export class VigenciaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Vigencia`;

  getAll(): Observable<OperationResponse<Vigencia[]>> {
    return this.http.get<OperationResponse<Vigencia[]>>(`${this.apiUrl}`);
  }

  create(data: VigenciaRequest): Observable<OperationResponse<Vigencia>> {
    return this.http.post<OperationResponse<Vigencia>>(`${this.apiUrl}`, data);
  }

  update(id: number, data: VigenciaRequest): Observable<OperationResponse<Vigencia>> {
    return this.http.put<OperationResponse<Vigencia>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  setActivaEjecucion(id: number): Observable<OperationResponse<Vigencia>> {
    return this.http.post<OperationResponse<Vigencia>>(`${this.apiUrl}/${id}/activar-ejecucion`, {});
  }
}
