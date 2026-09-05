import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Só anexa o token em chamadas para a nossa API (nunca para terceiros). */
function ehChamadaDaApi(url: string): boolean {
  return (
    url.startsWith(environment.apiUrl) ||
    url.startsWith('/') ||
    url.startsWith(`${location.origin}/`)
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const request =
    token && ehChamadaDaApi(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
