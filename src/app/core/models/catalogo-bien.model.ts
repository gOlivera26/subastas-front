export interface CatalogoBien {
  idItem: number; idItemRel?: number; codigo: string; nItem: string;
  idVigencia: number; idOrganizacion?: number; idObjetoGasto?: number;
  organizacionNombre?: string; vigenciaEjercicio?: string; objetoGastoNombre?: string;
}

export interface CatalogoBienTreeItem extends CatalogoBien {
  children: CatalogoBienTreeItem[];
  hasChildren: boolean;
}
