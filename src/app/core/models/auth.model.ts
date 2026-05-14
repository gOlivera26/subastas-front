import { AppModulo } from './modulos.model';

export interface LoginResponse {
  token: string;
  nombreUsuario: string;
  email: string;
  rol: string;
  modulos: AppModulo[];
}

export interface ProfileResponse {
  nombre: string;
  apellido: string;
  email: string;
  nroDocumento: string;
  telefono: string;
  rol: string;
}