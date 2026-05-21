export interface ObjetoGasto {
  idObjetoGasto: number;
  idObjetoGastoRel?: number;
  numeroObjeto: string;
  nombreObjeto: string;
  idVigencia: number;
  idOrganizacion?: number;
  imputaEjecucion?: boolean;
  organizacionNombre?: string;
  vigenciaEjercicio?: string;
}
