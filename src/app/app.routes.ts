import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './features/public/public-layout/public-layout.component';
import { HomeComponent } from './features/public/home/home.component';
import { SubastasActivasComponent } from './features/subastas/subastas-activas/subastas-activas.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { ModulosComponent } from './features/modulos/modulos.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout.component';
import { AdminUsuariosComponent } from './features/admin/usuarios/pending-users/pending-users.component';
import { ActiveUsersComponent } from './features/admin/usuarios/active-users/active-users.component';
import { SeguridadComponent } from './features/admin/seguridad/seguridad.component';
import { ClasificadoresLayoutComponent } from './features/clasificadores/clasificadores-layout/clasificadores-layout.component';
import { ClasificadoresHomeComponent } from './features/clasificadores/home/home.component';
import { VigenciasComponent } from './features/clasificadores/vigencias/vigencias.component';

import { UnidadesAdministrativasComponent } from './features/clasificadores/unidades-administrativas/unidades-administrativas.component';
import { OrganizacionesComponent } from './features/clasificadores/organizaciones/organizaciones.component';
import { ObjetosGastoComponent } from './features/clasificadores/objetos-gasto/objetos-gasto.component';
import { CatalogoBienesComponent } from './features/clasificadores/catalogo-bienes/catalogo-bienes.component';
import { CategoriasProgramaticasComponent } from './features/clasificadores/categorias-programaticas/categorias-programaticas.component';

import { ProveedoresLayoutComponent } from './features/proveedores/proveedores-layout/proveedores-layout.component';
import { ProveedoresHomeComponent } from './features/proveedores/home/home.component';
import { ProveedoresComponent } from './features/proveedores/proveedores-layout/proveedores.component';
import { RubrosListComponent } from './features/proveedores/rubros-list/rubros-list.component';
import { RubrosTreeComponent } from './features/proveedores/rubros-tree/rubros-tree.component';

import { LicitacionesLayoutComponent } from './features/licitaciones/licitaciones-layout/licitaciones-layout.component';
import { LicitacionesHomeComponent } from './features/licitaciones/home/home.component';
import { NotaPedidoComponent } from './features/licitaciones/nota-pedido/nota-pedido.component';
import { SubastaPlaceholderComponent } from './features/licitaciones/subasta/subasta.component';
import { InformesPlaceholderComponent } from './features/licitaciones/informes/informes.component';
import { TableroPlaceholderComponent } from './features/licitaciones/tablero/tablero.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent, data: { state: 'home' } },
      { path: 'subastas-activas', component: SubastasActivasComponent, data: { state: 'subastas' } },
      { path: 'login', component: LoginComponent, data: { state: 'login' } },
      { path: 'register', component: RegisterComponent, data: { state: 'register' } },
      { path: 'modulos', component: ModulosComponent, canActivate: [authGuard], data: { state: 'modulos' } }
    ],
  },
  
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'usuarios/pendientes', component: AdminUsuariosComponent, data: { state: 'pendientes', title: 'Aprobaciones' } }, 
      { path: 'usuarios/activos', component: ActiveUsersComponent, data: { state: 'activos', title: 'Usuarios Activos' } },
      { path: 'seguridad', component: SeguridadComponent, data: { state: 'seguridad', title: 'Seguridad' } },
      { path: '', redirectTo: 'usuarios/pendientes', pathMatch: 'full' }
    ]
  },

  {
    path: 'clasificadores',
    component: ClasificadoresLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: ClasificadoresHomeComponent, data: { state: 'clasificadores-home', title: 'Inicio' } },
      { path: 'organizaciones', component: OrganizacionesComponent, data: { state: 'organizaciones', title: 'Organizaciones' } },
      { path: 'vigencias', component: VigenciasComponent, data: { state: 'vigencias', title: 'Vigencias' } },
      { path: 'unidades-administrativas', component: UnidadesAdministrativasComponent, data: { state: 'unidades', title: 'Unidades Administrativas' } },
      { path: 'objetos-gasto', component: ObjetosGastoComponent, data: { state: 'objetos-gasto', title: 'Objetos del Gasto' } },
      { path: 'catalogo-bienes', component: CatalogoBienesComponent, data: { state: 'catalogo-bienes', title: 'Catálogo de Bienes' } },
      { path: 'categorias-programaticas', component: CategoriasProgramaticasComponent, data: { state: 'categorias-programaticas', title: 'Categorías Programáticas' } },
    ]
  },

  {
    path: 'proveedores',
    component: ProveedoresLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: ProveedoresHomeComponent, data: { state: 'proveedores-home', title: 'Inicio' } },
      { path: 'listado', component: ProveedoresComponent, data: { state: 'proveedores-listado', title: 'Listado de Proveedores' } },
      { path: 'rubros-list', component: RubrosListComponent, data: { state: 'rubros-list', title: 'Rubros (Lista)' } },
      { path: 'rubros-tree', component: RubrosTreeComponent, data: { state: 'rubros-tree', title: 'Rubros (Árbol)' } }
    ]
  },

  {
    path: 'licitaciones',
    component: LicitacionesLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: LicitacionesHomeComponent, data: { state: 'licitaciones-home', title: 'Inicio' } },
      { path: 'nota-pedido', component: NotaPedidoComponent, data: { state: 'nota-pedido', title: 'Nota de Pedido' } },
      { path: 'subasta', component: SubastaPlaceholderComponent, data: { state: 'subasta', title: 'Subasta' } },
      { path: 'informes', component: InformesPlaceholderComponent, data: { state: 'informes', title: 'Informes' } },
      { path: 'tablero', component: TableroPlaceholderComponent, data: { state: 'tablero', title: 'Tablero' } },
    ]
  },

  { path: '**', redirectTo: '' },
];