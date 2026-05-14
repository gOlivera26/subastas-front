import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';

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
  
}