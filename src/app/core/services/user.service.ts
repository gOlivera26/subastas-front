import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OperationResponse } from '../models/operation-response.model';
import { environment } from '../../../environments/environment';

export interface PendingUser {
  idUsuario: string;
  nombreCompleto: string;
  email: string;
  documento: string;
  tipoUsuario: string;
  entidadRepresentada: string;
  fechaRegistro: string;
}

export interface ActiveUser {
  idUsuario: string;
  nombreCompleto: string;
  email: string;
  documento: string;
  rol: string;
  tipoUsuario: string;
  entidadRepresentada: string;
  estado: string;
}

export interface UserAudit {
  ultimoAcceso: string | null;
  fechaRegistro: string | null;
  creadoPor: string;
  fechaAprobacion: string | null;
  fechaModificacion: string | null;
  modificadoPor: string;
  aprobadoPorNombre: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
 private apiUrl = `${environment.apiUrl}/User`;

  getPendingUsers(): Observable<OperationResponse<PendingUser[]>> {
    return this.http.get<OperationResponse<PendingUser[]>>(`${this.apiUrl}/pending`);
  }

  approveUser(userId: string): Observable<OperationResponse<boolean>> {
    return this.http.post<OperationResponse<boolean>>(`${this.apiUrl}/${userId}/approve`, {});
  }

  getActiveUsers(page: number = 1, pageSize: number = 10, searchTerm: string = '', sortBy?: string, sortDirection?: string): Observable<OperationResponse<ActiveUser[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }
    if (sortBy) params = params.set('sortBy', sortBy);
    if (sortDirection) params = params.set('sortDirection', sortDirection);
    
    return this.http.get<OperationResponse<ActiveUser[]>>(`${this.apiUrl}/active`, { params });
  }

  updateUserRole(userId: string, newRoleId: number): Observable<OperationResponse<boolean>> {
    return this.http.put<OperationResponse<boolean>>(`${this.apiUrl}/${userId}/role`, newRoleId);
  }

  resetPassword(userId: string): Observable<OperationResponse<string>> {
    return this.http.post<OperationResponse<string>>(`${this.apiUrl}/${userId}/reset-password`, {});
  }

  unlinkUser(userId: string): Observable<OperationResponse<boolean>> {
    return this.http.post<OperationResponse<boolean>>(`${this.apiUrl}/${userId}/unlink`, {});
  }

  linkUser(userId: string, payload: { tipoEntidad: string, idEntidad: number }): Observable<OperationResponse<boolean>> {
    return this.http.post<OperationResponse<boolean>>(`${this.apiUrl}/${userId}/link`, payload);
  }

  getUserAudit(userId: string): Observable<OperationResponse<UserAudit>> {
    return this.http.get<OperationResponse<UserAudit>>(`${this.apiUrl}/${userId}/audit`);
  }
}