import { Component, signal, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-proveedores-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, NgClass],
  templateUrl: './proveedores-layout.component.html',
})
export class ProveedoresLayoutComponent {
  private authService = inject(AuthService);

  isSidebarOpen = signal(localStorage.getItem('sidebar-proveedores') !== 'false');
  isUserMenuOpen = signal(false);
  isDarkMode = signal(document.documentElement.classList.contains('dark'));

  user = computed(() => this.authService.currentUser());

  toggleSidebar() {
    this.isSidebarOpen.update(v => {
      localStorage.setItem('sidebar-proveedores', String(!v));
      return !v;
    });
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
    localStorage.setItem('sidebar-proveedores', 'false');
  }

  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) this.closeSidebar();
  }

  toggleUserMenu() {
    this.isUserMenuOpen.update(v => !v);
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  logout() {
    this.authService.logout();
  }
}
