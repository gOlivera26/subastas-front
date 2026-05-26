import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-config-subastas-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, FooterComponent],
  templateUrl: './config-subastas-layout.component.html',
})
export class ConfigSubastasLayoutComponent {
  auth = inject(AuthService);
  isSidebarOpen = signal(true);
  toggleSidebar() { this.isSidebarOpen.update(v => !v); }
  closeSidebarOnMobile() { if (window.innerWidth < 1024) this.isSidebarOpen.set(false); }
}
