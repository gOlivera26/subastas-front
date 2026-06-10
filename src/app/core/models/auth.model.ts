import { AppModulo } from './modulos.model';

export interface AppPagina {
  id: number;
  idModulo: number;
  moduloTitulo: string;
  keyName: string;
  titulo: string;
  rutaFrontend: string;
}

export interface EntidadDto {
  id: number;
  tipo: string;
  nombre: string;
}

export interface LoginResponse {
  token: string;
  nombreUsuario: string;
  email: string;
  rol: string;
  modulos: AppModulo[];
  paginas: AppPagina[];
  entidades: EntidadDto[];
}

export interface ProfileResponse {
  nombre: string;
  apellido: string;
  email: string;
  nroDocumento: string;
  telefono: string;
  rol: string;
}