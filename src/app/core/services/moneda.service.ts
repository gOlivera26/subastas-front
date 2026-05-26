import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';
import { Moneda } from '../models/moneda.model';

export interface MonedaRequest {
  simbolo: string;
  nombre: string;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class MonedaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Moneda`;

  getAll(): Observable<OperationResponse<Moneda[]>> { return this.http.get<OperationResponse<Moneda[]>>(this.apiUrl); }
  create(d: MonedaRequest) { return this.http.post<OperationResponse<Moneda>>(this.apiUrl, d); }
  update(id: number, d: MonedaRequest) { return this.http.put<OperationResponse<Moneda>>(`${this.apiUrl}/${id}`, d); }
  delete(id: number) { return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`); }
}
