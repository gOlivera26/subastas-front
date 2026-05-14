import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './features/public/public-layout/public-layout.component';
import { HomeComponent } from './features/public/home/home.component';
import { SubastasActivasComponent } from './features/subastas/subastas-activas/subastas-activas.component';
import { LoginComponent } from './features/auth/login/login.component';
import { authGuard } from './core/guards/auth.guard';
import { ModulosComponent } from './features/modulos/modulos.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout.component';
import { AdminUsuariosComponent } from './features/admin/usuarios/pending-users/pending-users';
import { ActiveUsersComponent } from './features/admin/usuarios/active-users/active-users.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'subastas-activas', component: SubastasActivasComponent },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'modulos', component: ModulosComponent, canActivate: [authGuard] }
    ],
  },
  
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'usuarios/pendientes', component: AdminUsuariosComponent }, 
      
       { path: 'usuarios/activos', component: ActiveUsersComponent }, // Lo activaremos en el próximo paso
      
      { path: '', redirectTo: 'usuarios/pendientes', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: '' },
];