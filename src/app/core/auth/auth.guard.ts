import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { Papel } from '../models/usuario.model';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { redirect: state.url },
  });
};

/** Restringe a rota a papéis específicos. Use via `canActivate: [authGuard, roleGuard('DIRETORA')]`. */
export const roleGuard = (...papeis: Papel[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasPapel(...papeis)) return true;
    return router.createUrlTree(['/']);
  };
};
