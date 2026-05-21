import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-proveedores-home',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './home.component.html',
})
export class ProveedoresHomeComponent {}
