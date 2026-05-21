import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';
import { routeFade } from '../../../core/animations/route-animations';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './public-layout.component.html',
  animations: [routeFade],
})
export class PublicLayoutComponent {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  routeState = signal('initial');

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      let route = this.activatedRoute;
      while (route.firstChild) route = route.firstChild;
      queueMicrotask(() => {
        this.routeState.set(route.snapshot.data['state'] || 'home');
      });
    });
  }
}
