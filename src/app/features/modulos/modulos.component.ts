import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { AppModulo } from '../../core/models/modulos.model';

@Component({
  selector: 'app-modulos',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './modulos.component.html',
})
export class ModulosComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (returnUrl) {
      sessionStorage.removeItem('returnUrl');
      this.router.navigateByUrl(returnUrl);
    }
  }

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