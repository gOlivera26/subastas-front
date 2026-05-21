import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgClass } from '@angular/common';
import { filter } from 'rxjs/operators';
import { routeFade } from '../../../core/animations/route-animations';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-clasificadores-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, NgClass],
  templateUrl: './clasificadores-layout.component.html',
  animations: [routeFade],
})
export class ClasificadoresLayoutComponent {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  protected auth = inject(AuthService);

  isSidebarOpen = signal(localStorage.getItem('sidebar-clasificadores') !== 'false');
  pageTitle = signal('');
  routeState = signal('initial');

  showBreadcrumb = computed(() => this.pageTitle() !== '' && this.pageTitle() !== 'Inicio');

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
      localStorage.setItem('sidebar-clasificadores', String(!v));
      return !v;
    });
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
    localStorage.setItem('sidebar-clasificadores', 'false');
  }

  closeSidebarOnMobile() {
    if (window.innerWidth < 1024) this.closeSidebar();
  }
}
