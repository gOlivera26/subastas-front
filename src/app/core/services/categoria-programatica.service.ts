import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';
import { CategoriaProgramatica } from '../models/categoria-programatica.model';

export interface CategoriaProgramaticaRequest {
  idCatProgRel?: number; idOrganizacion?: number; idUnidadAdm?: number;
  idVigencia: number; codigo: number; nombre: string; naturaleza?: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriaProgramaticaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/CategoriaProgramatica`;

  getAll(idVigencia?: number): Observable<OperationResponse<CategoriaProgramatica[]>> {
    return this.http.get<OperationResponse<CategoriaProgramatica[]>>(idVigencia != null ? `${this.apiUrl}?idVigencia=${idVigencia}` : this.apiUrl);
  }
  create(d: CategoriaProgramaticaRequest) { return this.http.post<OperationResponse<CategoriaProgramatica>>(this.apiUrl, d); }
  update(id: number, d: CategoriaProgramaticaRequest) { return this.http.put<OperationResponse<CategoriaProgramatica>>(`${this.apiUrl}/${id}`, d); }
  delete(id: number) { return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`); }
}
