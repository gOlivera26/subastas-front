import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
function checkPageAccess(route: ActivatedRouteSnapshot) {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);
  const pageKey = route.data?.['pageKey'] as string | undefined;

  if (!pageKey) return true;
  if (!authService.isAuthenticated()) return router.createUrlTree(['/login']);
  if (authService.hasPageAccess(pageKey)) return true;

  notify.showError('No tienes permisos para acceder a esta sección.');
  return router.createUrlTree(['/modulos']);
}

export const pageAccessChildGuard: CanActivateChildFn = (childRoute) => checkPageAccess(childRoute);
