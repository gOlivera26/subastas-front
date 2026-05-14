import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OperationResponse } from '../models/operation-response.model';
import { environment } from '../../../environments/environment';

export interface Organization {
  idOrganizacion: number;
  nombre: string;
  abreviatura: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Organization`;

  getActiveOrganizations(): Observable<OperationResponse<Organization[]>> {
    return this.http.get<OperationResponse<Organization[]>>(`${this.apiUrl}/active`);
  }
}