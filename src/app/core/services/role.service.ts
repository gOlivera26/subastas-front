import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OperationResponse } from '../models/operation-response.model';
import { environment } from '../../../environments/environment';

export interface Role {
  id: number;
  nombre: string;
  descripcion: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Role`;

  getActiveRoles(): Observable<OperationResponse<Role[]>> {
    return this.http.get<OperationResponse<Role[]>>(`${this.apiUrl}/active`);
  }
}