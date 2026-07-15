import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-config-subastas-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, FooterComponent, HeaderComponent],
  templateUrl: './config-subastas-layout.component.html',
})
export class ConfigSubastasLayoutComponent {
  auth = inject(AuthService);
  private readonly sidebarStorageKey = 'owen-sidebar-open';
  isSidebarOpen = signal(this.getInitialSidebarState(true));

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
