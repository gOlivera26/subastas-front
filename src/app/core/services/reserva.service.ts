import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { OperationResponse } from '../models/operation-response.model';
import {
  Reserva,
  ReservaRequest,
  ReservaDetalle,
  ReservaDetalleRequest,
  FiltrosReserva,
  UnidadAdministrativa,
  SubResponsable,
  Vigencia,
  EstadoReserva,
  Bien,
  Moneda
} from '../models/reserva.model';

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  // Reserva (Nota de Pedido) CRUD
  getAll(filtros?: FiltrosReserva): Observable<OperationResponse<Reserva[]>> {
    let url = `${this.apiUrl}/Reserva`;
    if (filtros) {
      const params = new URLSearchParams();
      if (filtros.idUnidadAdm) params.set('idUnidadAdm', filtros.idUnidadAdm.toString());
      if (filtros.idVigencia) params.set('idVigencia', filtros.idVigencia.toString());
      if (filtros.nroReserva) params.set('nroReserva', filtros.nroReserva);
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }
    return this.http.get<OperationResponse<Reserva[]>>(url);
  }

  getById(id: number): Observable<OperationResponse<Reserva>> {
    return this.http.get<OperationResponse<Reserva>>(`${this.apiUrl}/Reserva/${id}`);
  }

  create(dto: ReservaRequest): Observable<OperationResponse<Reserva>> {
    return this.http.post<OperationResponse<Reserva>>(`${this.apiUrl}/Reserva`, dto);
  }

  update(id: number, dto: ReservaRequest): Observable<OperationResponse<Reserva>> {
    return this.http.put<OperationResponse<Reserva>>(`${this.apiUrl}/Reserva/${id}`, dto);
  }

  delete(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/Reserva/${id}`);
  }

  // MODIFICADO: Ahora enviamos el motivo en el body
  autorizar(id: number, motivoAutorizacion: string): Observable<OperationResponse<Reserva>> {
    return this.http.post<OperationResponse<Reserva>>(`${this.apiUrl}/Reserva/${id}/autorizar`, { motivoAutorizacion });
  }

  clonar(id: number): Observable<OperationResponse<Reserva>> {
    return this.http.post<OperationResponse<Reserva>>(`${this.apiUrl}/Reserva/${id}/clonar`, {});
  }

  // Reserva Detalle CRUD
  getDetalleByReservaId(reservaId: number): Observable<OperationResponse<ReservaDetalle[]>> {
    return this.http.get<OperationResponse<ReservaDetalle[]>>(`${this.apiUrl}/ReservaDetalle/reserva/${reservaId}`);
  }

  createDetalle(dto: ReservaDetalleRequest): Observable<OperationResponse<ReservaDetalle>> {
    return this.http.post<OperationResponse<ReservaDetalle>>(`${this.apiUrl}/ReservaDetalle`, dto);
  }

  updateDetalle(id: number, dto: ReservaDetalleRequest): Observable<OperationResponse<ReservaDetalle>> {
    return this.http.put<OperationResponse<ReservaDetalle>>(`${this.apiUrl}/ReservaDetalle/${id}`, dto);
  }

  deleteDetalle(id: number): Observable<OperationResponse<boolean>> {
    return this.http.delete<OperationResponse<boolean>>(`${this.apiUrl}/ReservaDetalle/${id}`);
  }

  // Datos auxiliares
  getUnidadesAdministrativas(): Observable<OperationResponse<UnidadAdministrativa[]>> {
    return this.http.get<OperationResponse<UnidadAdministrativa[]>>(`${this.apiUrl}/UnidadAdministrativa`);
  }

  getSubResponsables(idUA?: number): Observable<OperationResponse<SubResponsable[]>> {
    const url = idUA ? `${this.apiUrl}/SubResponsable?idUnidadAdm=${idUA}` : `${this.apiUrl}/SubResponsable`;
    return this.http.get<OperationResponse<SubResponsable[]>>(url);
  }

  getVigencias(): Observable<OperationResponse<Vigencia[]>> {
    return this.http.get<OperationResponse<Vigencia[]>>(`${this.apiUrl}/Vigencia`);
  }

  getEstados(): Observable<OperationResponse<EstadoReserva[]>> {
    return this.http.get<OperationResponse<EstadoReserva[]>>(`${this.apiUrl}/Reserva/estados`);
  }

  getBienes(idCodigoJur?: number, nombre?: string): Observable<OperationResponse<Bien[]>> {
    const params = new URLSearchParams();
    if (idCodigoJur) params.set('IdCodigoJur', idCodigoJur.toString());
    if (nombre) params.set('Nombre', nombre);
    const queryString = params.toString();
    const url = queryString ? `${this.apiUrl}/CatalogoBien?${queryString}` : `${this.apiUrl}/CatalogoBien`;
    return this.http.get<OperationResponse<Bien[]>>(url);
  }

  getMonedas(): Observable<OperationResponse<Moneda[]>> {
    return this.http.get<OperationResponse<Moneda[]>>(`${this.apiUrl}/Moneda`);
  }

  getCategoriasProgramaticas(): Observable<OperationResponse<any[]>> {
    return this.http.get<OperationResponse<any[]>>(`${this.apiUrl}/CategoriaProgramatica`);
  }

  desautorizarItem(idDetalle: number): Observable<OperationResponse<boolean>> {
    return this.http.post<OperationResponse<boolean>>(`${this.apiUrl}/ReservaDetalle/${idDetalle}/desautorizar`, {});
  }
}