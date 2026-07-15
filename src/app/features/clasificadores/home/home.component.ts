import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-clasificadores-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './home.component.html',
})
export class ClasificadoresHomeComponent {
  protected auth = inject(AuthService);
}
