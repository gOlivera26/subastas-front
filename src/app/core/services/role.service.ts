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

export interface RoleModule {
  idRolModulo: number;
  idRol: number;
  idModulo: number;
  moduloKeyName: string;
  moduloTitulo: string;
}

export interface AppModule {
  id: number;
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
}

export interface AppPage {
  id: number;
  idModulo: number;
  moduloTitulo: string;
  keyName: string;
  titulo: string;
  rutaFrontend: string;
}

export interface ModuloConPaginas {
  idModulo: number;
  moduloTitulo: string;
  paginas: AppPage[];
}

@Injectable({ providedIn: 'root' })
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Role`;

  getAll(): Observable<OperationResponse<Role[]>> { return this.http.get<OperationResponse<Role[]>>(this.apiUrl); }
  getActiveRoles(): Observable<OperationResponse<Role[]>> { return this.http.get<OperationResponse<Role[]>>(`${this.apiUrl}/active`); }
  create(data: { nombre: string; descripcion: string }): Observable<OperationResponse<Role>> { return this.http.post<OperationResponse<Role>>(this.apiUrl, data); }
  update(id: number, data: { nombre: string; descripcion: string }): Observable<OperationResponse<Role>> { return this.http.put<OperationResponse<Role>>(`${this.apiUrl}/${id}`, data); }
  delete(id: number): Observable<OperationResponse<boolean>> { return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/${id}`); }
  getModules(idRol: number): Observable<OperationResponse<RoleModule[]>> { return this.http.get<OperationResponse<RoleModule[]>>(`${this.apiUrl}/${idRol}/modulos`); }
  assignModule(idRol: number, idModulo: number): Observable<OperationResponse<RoleModule>> { return this.http.post<OperationResponse<RoleModule>>(`${this.apiUrl}/modulos`, { idRol, idModulo }); }
  unassignModule(idRol: number, idModulo: number): Observable<OperationResponse<boolean>> { return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/modulos/${idRol}/${idModulo}`); }
  getAllModules(): Observable<OperationResponse<AppModule[]>> { return this.http.get<OperationResponse<AppModule[]>>(`${this.apiUrl}/modulos`); }

  // Pages (granular permissions)
  getAllPages(): Observable<OperationResponse<AppPage[]>> { return this.http.get<OperationResponse<AppPage[]>>(`${this.apiUrl}/paginas`); }
  getPagesByRole(idRol: number): Observable<OperationResponse<AppPage[]>> { return this.http.get<OperationResponse<AppPage[]>>(`${this.apiUrl}/${idRol}/paginas`); }
  assignPage(idRol: number, idPagina: number): Observable<OperationResponse<AppPage>> { return this.http.post<OperationResponse<AppPage>>(`${this.apiUrl}/paginas`, { idRol, idModulo: idPagina }); }
  unassignPage(idRol: number, idPagina: number): Observable<OperationResponse<boolean>> { return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/paginas/${idRol}/${idPagina}`); }
  getModulosConPaginas(): Observable<OperationResponse<ModuloConPaginas[]>> { return this.http.get<OperationResponse<ModuloConPaginas[]>>(`${this.apiUrl}/modulos-con-paginas`); }
}
