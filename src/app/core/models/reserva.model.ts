export interface Reserva {
  idReserva: number;
  nroReserva: string;
  idUnidadAdm?: number;
  nombreUnidadAdm?: string;
  idSubResponsable?: number;
  nombreSubResponsable?: string; 
  idVigencia?: number;
  idEstado?: number;
  descripcionEstado?: string;
  fechaReserva?: string;
  fechaAprobacion?: string;
  observacion?: string;
  idJurisdiccion?: number;
  nombreJur?: string;
  detalles?: ReservaDetalle[];
}

export interface ReservaRequest {
  idUnidadAdm: number;
  idSubResponsable: number;
  idVigencia?: number;
  observacion?: string;
  fechaReserva?: string;
}

export interface ReservaDetalle {
  idReservaDet?: number;
  idReserva?: number;
  idCatProg?: number;
  nombreCategoriaProgramatica?: string;
  idItem?: number;
  nombreBien?: string;
  idMoneda?: number;
  nombreMoneda?: string;
  cantidad?: number;
  importe?: number;
  importeFuturo?: number;
  especificacionesTecnicas?: string;
  fechaEntrega?: string;
  plazoEntregaDesde?: string;
  plazoEntregaHasta?: string;
  idEstado?: number;
  descripcionEstado?: string;
  cantidadRestante?: number;
}

export interface ReservaDetalleRequest {
  idReserva: number;
  idCatProg?: number;
  idItem?: number;
  idMoneda?: number;
  idObjetoGasto?: number;
  cantidad?: number;
  importe?: number;
  importeFuturo?: number;
  especificacionesTecnicas?: string;
  fechaEntrega?: string;
  plazoEntregaDesde?: string;
  plazoEntregaHasta?: string;
}

export interface BienFormState {
  idCatProg?: number;
  idItem?: number;
  nombreBienSeleccionado?: string;
  idMoneda?: number;
  idObjetoGasto?: number;
  cantidad?: number;
  importe?: number;
  importeFuturo?: number;
  especificacionesTecnicas?: string;
  fechaEntrega?: string;
  plazoEntregaDesde?: string;
  plazoEntregaHasta?: string;
}

export interface FiltrosReserva {
  idUnidadAdm?: number;
  idVigencia?: number;
  nroReserva?: string;
}

export interface UnidadAdministrativa {
  idUnidadAdm: number;
  nombreUnidadAdm: string;
  idOrganizacion?: number;
  idVigencia?: number;
}

export interface SubResponsable {
  idSubResponsables: number;
  nombre: string;
  idUnidadAdm?: number;
}

export interface Vigencia {
  idVigencia: number;
  ejercicio: number;
  descripcion?: string;
  activa?: boolean;
}

export interface EstadoReserva {
  idEstado: number;
  descripcion: string;
}

export interface Bien {
  idItem: number;
  codigo: string;
  nItem: string;
  nombreBien?: string;
  idCatProg?: number;
  idVigencia?: number;
  idOrganizacion?: number;
  idObjetoGasto?: number;
  organizacionNombre?: string;
  vigenciaEjercicio?: string;
  objetoGastoNombre?: string;
}

export interface Moneda {
  idMoneda: number;
  nombre: string;
  simbolo?: string;
}