import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { AppModulo } from '../../core/models/modulos.model';

@Component({
  selector: 'app-modulos',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './modulos.component.html',
})
export class ModulosComponent {
  private authService = inject(AuthService);

  modulosPermitidos = computed(() => {
    const user = this.authService.currentUser();
    return user?.modulos || [];
  });

  moduloRoute(modulo: AppModulo): string {
    const identity = `${modulo.keyName} ${modulo.titulo}`.toLowerCase();

    if ((identity.includes('compra') || identity.includes('venta')) && modulo.ruta === '/subastas-activas') {
      return '/compra-venta';
    }

    return modulo.ruta;
  }
}