export interface CategoriaProgramatica {
  idCatProg: number; idCatProgRel?: number; idOrganizacion?: number; idUnidadAdm?: number;
  idVigencia: number; codigo: number; nombre: string; naturaleza?: string;
  nivel: number; hasChildren: boolean; nombreJerarquia: string;
  organizacionNombre?: string; unidadAdmNombre?: string; vigenciaEjercicio?: string;
}

export interface CategoriaTreeItem extends CategoriaProgramatica {
  children: CategoriaTreeItem[];
}
