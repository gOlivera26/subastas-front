import { Component, HostListener, signal, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgClass } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { routeFade } from '../../../core/animations/route-animations';

@Component({
  selector: 'app-proveedores-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, NgClass],
  templateUrl: './proveedores-layout.component.html',
  animations: [routeFade],
})
export class ProveedoresLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private readonly sidebarStorageKey = 'sidebar-proveedores';
  isSidebarOpen = signal(this.getInitialSidebarState(true));
  isUserMenuOpen = signal(false);
  isDarkMode = signal(document.documentElement.classList.contains('dark'));
  pageTitle = signal('');
  routeState = signal('initial');

  user = computed(() => this.authService.currentUser());

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
    const next = !this.isSidebarOpen();
    this.isSidebarOpen.set(next);

    if (this.isDesktopViewport()) {
      localStorage.setItem(this.sidebarStorageKey, String(next));
    }
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);

    if (this.isDesktopViewport()) {
      localStorage.setItem(this.sidebarStorageKey, 'false');
    }
  }

  closeSidebarOnMobile() {
    if (!this.isDesktopViewport()) this.isSidebarOpen.set(false);
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

  @HostListener('window:resize')
  onViewportResize() {
    if (!this.isDesktopViewport()) {
      this.isSidebarOpen.set(false);
      return;
    }

    this.isSidebarOpen.set(this.getInitialSidebarState(true));
  }

  private getInitialSidebarState(defaultOpen: boolean): boolean {
    if (!this.isDesktopViewport()) return false;

    const stored = localStorage.getItem(this.sidebarStorageKey);
    return stored === null ? defaultOpen : stored === 'true';
  }

  private isDesktopViewport(): boolean {
    return window.matchMedia('(min-width: 1024px)').matches;
  }

}
