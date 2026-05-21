export interface UnidadAdministrativa {
  idUnidadAdm: number;
  numeroUnidadAdm: number;
  nombreUnidadAdm: string;
  idVigencia: number;
  idOrganizacion?: number;
  organizacionNombre?: string;
  mail?: string;
  alias?: string;
  puerto?: number;
  smtp?: string;
  vigenciaEjercicio?: string;
}
