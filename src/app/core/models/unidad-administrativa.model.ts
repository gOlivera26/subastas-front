export interface UnidadAdministrativa {
  idUnidadAdm: number;
  numeroUnidadAdm: number;
  nombreUnidadAdm: string;
  idVigencia: number;
  idOrganizacion?: number;
  organizacionNombre?: string;
  nroServicioAdm?: number;
  idProveedor?: number;
  mail?: string;
  alias?: string;
  puerto?: number;
  smtp?: string;
  vigenciaEjercicio?: string;
}
