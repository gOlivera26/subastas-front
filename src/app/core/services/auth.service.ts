import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponse, ProfileResponse } from '../models/auth.model';
import { OperationResponse } from '../models/operation-response.model';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = `${environment.apiUrl}/Auth`;

  private hasValidSession(): boolean {
    return !!localStorage.getItem('token') && !!localStorage.getItem('user');
  }

  private getUserFromStorage(): LoginResponse | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated = signal<boolean>(this.hasValidSession());
  currentUser = signal<LoginResponse | null>(this.getUserFromStorage());

  login(email: string, password: string): Observable<OperationResponse<LoginResponse>> {
    return this.http.post<OperationResponse<LoginResponse>>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(res => {
          if (res.success && res.data) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data));
            
            this.isAuthenticated.set(true);
            this.currentUser.set(res.data);
          }
        })
      );
  }
  
  getProfile(): Observable<OperationResponse<ProfileResponse>> {
    return this.http.get<OperationResponse<ProfileResponse>>(`${this.apiUrl}/profile`);
  }

  changePassword(passwordActual: string, nuevaPassword: string): Observable<OperationResponse<boolean>> {
    return this.http.post<OperationResponse<boolean>>(`${this.apiUrl}/change-password`, {
      passwordActual,
      nuevaPassword
    });
  }

  register(userData: any): Observable<OperationResponse<LoginResponse>> {
  return this.http.post<OperationResponse<LoginResponse>>(`${this.apiUrl}/register`, userData);
}

updateProfile(nombre: string, apellido: string, telefono: string): Observable<OperationResponse<ProfileResponse>> {
    return this.http.put<OperationResponse<ProfileResponse>>(`${this.apiUrl}/profile`, {
      nombre,
      apellido,
      telefono
    });
  }

  updateProfileCache(nombreRazonSocial: string) {
    const current = this.currentUser();
    if (current) {
      const updatedUser = { ...current, nombreUsuario: nombreRazonSocial };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      this.currentUser.set(updatedUser);
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}