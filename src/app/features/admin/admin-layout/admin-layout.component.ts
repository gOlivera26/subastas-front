import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgClass } from '@angular/common';
import { filter } from 'rxjs/operators';
import { routeFade } from '../../../core/animations/route-animations';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, NgClass],
  templateUrl: './admin-layout.component.html',
  animations: [routeFade],
})
export class AdminLayoutComponent {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  isSidebarOpen = signal(false);
  pageTitle = signal('');
  routeState = signal('initial');

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      let route = this.activatedRoute;
      while (route.firstChild) route = route.firstChild;
      const state = route.snapshot.data['state'] || 'home';
      const title = route.snapshot.data['title'] || '';
      queueMicrotask(() => {
        this.routeState.set(state);
        this.pageTitle.set(title);
      });
    });
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => {
      localStorage.setItem('sidebar-admin', String(!v));
      return !v;
    });
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
    localStorage.setItem('sidebar-admin', 'false');
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