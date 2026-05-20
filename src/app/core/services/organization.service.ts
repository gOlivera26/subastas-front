import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationResponse } from '../models/operation-response.model';

export interface Organization {
  idOrganizacion: number;
  nombre: string;
  cuit: string;
  abreviatura: string;
  activo?: boolean;
}

export interface OrganizationRequest {
  nombre: string;
  cuit: string;
  abreviatura: string;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Organization`;

  getAll(): Observable<OperationResponse<Organization[]>> {
    return this.http.get<OperationResponse<Organization[]>>(`${this.apiUrl}`);
  }

  getActiveOrganizations(): Observable<OperationResponse<Organization[]>> {
    return this.http.get<OperationResponse<Organization[]>>(`${this.apiUrl}/active`);
  }

  getById(id: number): Observable<OperationResponse<Organization>> {
    return this.http.get<OperationResponse<Organization>>(`${this.apiUrl}/${id}`);
  }

  create(data: OrganizationRequest): Observable<OperationResponse<Organization>> {
    return this.http.post<OperationResponse<Organization>>(`${this.apiUrl}`, data);
  }

  update(id: number, data: OrganizationRequest): Observable<OperationResponse<Organization>> {
    return this.http.put<OperationResponse<Organization>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`);
  }
}