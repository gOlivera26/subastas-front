import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';
import { CatalogoBien } from '../models/catalogo-bien.model';

export interface CatalogoBienRequest {
  idItemRel?: number;
  codigo: string;
  nItem: string;
  idVigencia: number;
  idOrganizacion?: number;
  idObjetoGasto?: number;
}

export interface CatalogoBienBulkItem {
  idItem: number;
  idItemRel?: number;
  codigo: string;
  nItem: string;
  numeroObjeto: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogoBienService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/CatalogoBien`;

  getAll(idVigencia?: number): Observable<OperationResponse<CatalogoBien[]>> {
    let url = this.apiUrl;
    if (idVigencia != null) url += `?idVigencia=${idVigencia}`;
    return this.http.get<OperationResponse<CatalogoBien[]>>(url);
  }

  create(data: CatalogoBienRequest): Observable<OperationResponse<CatalogoBien>> {
    return this.http.post<OperationResponse<CatalogoBien>>(this.apiUrl, data);
  }

  update(id: number, data: CatalogoBienRequest): Observable<OperationResponse<CatalogoBien>> {
    return this.http.put<OperationResponse<CatalogoBien>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  bulkUpload(items: CatalogoBienBulkItem[], idOrganizacion?: number) {
    return this.http.post<OperationResponse<number>>(`${this.apiUrl}/upload`, { items, idOrganizacion });
  }
}
