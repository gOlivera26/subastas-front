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
import { ClasificadoresLayoutComponent } from './features/clasificadores/clasificadores-layout/clasificadores-layout.component';
import { ClasificadoresHomeComponent } from './features/clasificadores/home/home.component';
import { VigenciasComponent } from './features/clasificadores/vigencias/vigencias.component';

import { UnidadesAdministrativasComponent } from './features/clasificadores/unidades-administrativas/unidades-administrativas.component';
import { OrganizacionesComponent } from './features/clasificadores/organizaciones/organizaciones.component';

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
    ]
  },

  { path: '**', redirectTo: '' },
];