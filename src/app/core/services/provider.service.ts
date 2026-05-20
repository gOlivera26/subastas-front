import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OperationResponse } from '../models/operation-response.model';
import { environment } from '../../../environments/environment';

export interface ProviderResponse {
  id: number;
  razonSocial: string;
  cuit: string;
}

export interface ProviderListDto {
  id: number;
  razonSocial: string;
  cuit: string;
  cup: string;
  emailInstitucional: string;
  tipoPersona: string;
  hasConstanciaAfip: boolean;
  rubrosCount: number;
  domiciliosCount: number;
}

export interface ProviderListResponse {
  data: ProviderListDto[];
  total: number;
}

export interface CreateProviderDto {
  razonSocial: string;
  cuit: string;
  cup?: string;
  emailInstitucional: string;
  emailAlternativo?: string;
  idTipoPersona: number;
  urlConstanciaAfip?: string;
}

export interface UpdateProviderDto {
  id: number;
  razonSocial: string;
  cuit: string;
  cup?: string;
  emailInstitucional: string;
  emailAlternativo?: string;
  idTipoPersona: number;
  urlConstanciaAfip?: string;
}

export interface RubroListDto {
  id: number;
  codigo: string;
  descripcion: string;
  idRubroPadre: number | null;
  rubroPadre: string | null;
  activo: boolean;
  imputable: boolean;
}

export interface CreateRubroDto {
  codigo: string;
  descripcion: string;
  idRubroPadre?: number | null;
  imputable: boolean;
}

export interface UpdateRubroDto {
  id: number;
  codigo: string;
  descripcion: string;
  idRubroPadre?: number | null;
  imputable: boolean;
}

export interface RubroTreeDto {
  id: number;
  codigo: string;
  descripcion: string;
  idRubroPadre: number | null;
  imputable: boolean;
  hasChildren: boolean;
  children: RubroTreeDto[];
}

export interface RubroSearchResultDto {
  id: number;
  codigo: string;
  descripcion: string;
  hasChildren: boolean;
  level: number;
}

export interface ProviderRubroDto {
  idRubro: number;
  codigo: string;
  descripcion: string;
  idRubroPadre: number | null;
}

export interface DomicilioDto {
  id: number;
  idPersona: number;
  idTipoDomicilio: number;
  tipoDomicilio: string;
  calle: string;
  numero: string;
  piso?: string;
  departamento?: string;
  barrio: string;
  ciudad: string;
  idProvincia: number;
  provincia: string;
  codigoPostal: string;
  telefono: string;
  fax?: string;
}

export interface CreateDomicilioDto {
  idTipoDomicilio: number;
  calle: string;
  numero: string;
  piso?: string;
  departamento?: string;
  barrio: string;
  ciudad: string;
  idProvincia: number;
  codigoPostal: string;
  telefono: string;
  fax?: string;
}

export interface UpdateDomicilioDto {
  id: number;
  idTipoDomicilio: number;
  calle: string;
  numero: string;
  piso?: string;
  departamento?: string;
  barrio: string;
  ciudad: string;
  idProvincia: number;
  codigoPostal: string;
  telefono: string;
  fax?: string;
}

export interface TipoDomicilioDto {
  id: number;
  descripcion: string;
}

export interface ProvinciaDto {
  id: number;
  nombre: string;
}

export interface AfipPersonDataDto {
  nombre: string;
  tipoPersona: string;
  domicilioFiscal: string;
  estadoClave: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProviderService {
  private http = inject(HttpClient);
  private providerUrl = `${environment.apiUrl}/Provider`;
  private domicilioUrl = `${environment.apiUrl}/Domicilio`;
  private rubroUrl = `${environment.apiUrl}/Rubro`;

  verifyCuit(cuit: string): Observable<OperationResponse<ProviderResponse>> {
    return this.http.get<OperationResponse<ProviderResponse>>(`${this.providerUrl}/verify/${cuit}`);
  }

  getProviders(page: number = 1, pageSize: number = 10, q?: string, sortBy?: string, sortDirection?: string): Observable<OperationResponse<ProviderListResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (q) params = params.set('q', q);
    if (sortBy) params = params.set('sortBy', sortBy);
    if (sortDirection) params = params.set('sortDirection', sortDirection);
    return this.http.get<OperationResponse<ProviderListResponse>>(this.providerUrl, { params });
  }

  createProvider(dto: CreateProviderDto): Observable<OperationResponse<ProviderResponse>> {
    return this.http.post<OperationResponse<ProviderResponse>>(this.providerUrl, dto);
  }

  updateProvider(dto: UpdateProviderDto): Observable<OperationResponse<ProviderResponse>> {
    return this.http.put<OperationResponse<ProviderResponse>>(this.providerUrl, dto);
  }

  verifyAfipCuit(cuit: string): Observable<OperationResponse<AfipPersonDataDto>> {
    return this.http.get<OperationResponse<AfipPersonDataDto>>(`${this.providerUrl}/afip/verify/${cuit}`);
  }

  uploadConstanciaAfip(providerId: number, file: File): Observable<OperationResponse<string>> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<OperationResponse<string>>(`${this.providerUrl}/${providerId}/constancia-afip`, formData);
  }

  getProviderRubros(providerId: number): Observable<OperationResponse<ProviderRubroDto[]>> {
    return this.http.get<OperationResponse<ProviderRubroDto[]>>(`${this.providerUrl}/${providerId}/rubros`);
  }

  linkProviderRubros(providerId: number, rubroIds: number[]): Observable<OperationResponse<boolean>> {
    return this.http.post<OperationResponse<boolean>>(`${this.providerUrl}/${providerId}/rubros`, rubroIds);
  }

  unlinkProviderRubro(providerId: number, rubroId: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.providerUrl}/${providerId}/rubros/${rubroId}`);
  }

  getDomiciliosByPersona(personaId: number): Observable<OperationResponse<DomicilioDto[]>> {
    return this.http.get<OperationResponse<DomicilioDto[]>>(`${this.domicilioUrl}/persona/${personaId}`);
  }

  createDomicilio(personaId: number, dto: CreateDomicilioDto): Observable<OperationResponse<DomicilioDto>> {
    return this.http.post<OperationResponse<DomicilioDto>>(`${this.domicilioUrl}/persona/${personaId}`, dto);
  }

  updateDomicilio(dto: UpdateDomicilioDto): Observable<OperationResponse<DomicilioDto>> {
    return this.http.put<OperationResponse<DomicilioDto>>(this.domicilioUrl, dto);
  }

  deleteDomicilio(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.domicilioUrl}/${id}`);
  }

  getTiposDomicilio(): Observable<OperationResponse<TipoDomicilioDto[]>> {
    return this.http.get<OperationResponse<TipoDomicilioDto[]>>(`${this.domicilioUrl}/tipos-domicilio`);
  }

  getProvincias(): Observable<OperationResponse<ProvinciaDto[]>> {
    return this.http.get<OperationResponse<ProvinciaDto[]>>(`${this.domicilioUrl}/provincias`);
  }

  getRubros(page: number = 1, pageSize: number = 20, q?: string, sortBy?: string, sortDirection?: string): Observable<OperationResponse<{ data: RubroListDto[], total: number }>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (q) params = params.set('q', q);
    if (sortBy) params = params.set('sortBy', sortBy);
    if (sortDirection) params = params.set('sortDirection', sortDirection);
    return this.http.get<OperationResponse<{ data: RubroListDto[], total: number }>>(this.rubroUrl, { params });
  }

  createRubro(dto: CreateRubroDto): Observable<OperationResponse<RubroListDto>> {
    return this.http.post<OperationResponse<RubroListDto>>(this.rubroUrl, dto);
  }

  updateRubro(dto: UpdateRubroDto): Observable<OperationResponse<RubroListDto>> {
    return this.http.put<OperationResponse<RubroListDto>>(this.rubroUrl, dto);
  }

  deleteRubro(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.rubroUrl}/${id}`);
  }

  getRubroTree(): Observable<OperationResponse<RubroTreeDto[]>> {
    return this.http.get<OperationResponse<RubroTreeDto[]>>(`${this.rubroUrl}/tree`);
  }

  getRubroChildren(parentId: number): Observable<OperationResponse<RubroTreeDto[]>> {
    return this.http.get<OperationResponse<RubroTreeDto[]>>(`${this.rubroUrl}/${parentId}/children`);
  }

  searchRubros(q: string): Observable<OperationResponse<RubroSearchResultDto[]>> {
    return this.http.get<OperationResponse<RubroSearchResultDto[]>>(`${this.rubroUrl}/search`, {
      params: { q }
    });
  }
}
