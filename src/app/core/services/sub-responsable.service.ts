import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';
import { SubResponsable } from '../models/sub-responsable.model';

export interface SubResponsableRequest {
  codigo: string;
  nombre: string;
  idSubRespRel?: number;
  vigente: boolean;
  idUnidadAdm?: number;
}

export interface SubResponsableBulkItem {
  codigo: string;
  nombre: string;
  idUnidadAdm?: number;
  nombreUnidadAdm?: string;
}

@Injectable({ providedIn: 'root' })
export class SubResponsableService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/SubResponsable`;

  getAll(idUnidadAdm?: number): Observable<OperationResponse<SubResponsable[]>> {
    return this.http.get<OperationResponse<SubResponsable[]>>(idUnidadAdm != null ? `${this.apiUrl}?idUnidadAdm=${idUnidadAdm}` : this.apiUrl);
  }
  create(d: SubResponsableRequest) { return this.http.post<OperationResponse<SubResponsable>>(this.apiUrl, d); }
  update(id: number, d: SubResponsableRequest) { return this.http.put<OperationResponse<SubResponsable>>(`${this.apiUrl}/${id}`, d); }
  delete(id: number) { return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`); }
  bulkUpload(items: SubResponsableBulkItem[]) { return this.http.post<OperationResponse<number>>(`${this.apiUrl}/upload`, { items }); }
}
