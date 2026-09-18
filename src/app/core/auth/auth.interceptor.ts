import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { ehChamadaDaApi } from '../util/url-api';

/** Rotas de login/cadastro: 401 lá é senha errada, não sessão expirada. */
function ehRotaDeAutenticacao(url: string): boolean {
  try {
    return new URL(url, location.origin).pathname.startsWith('/auth/');
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const dialog = inject(MatDialog);
  const token = auth.token();

  const request =
    token && ehChamadaDaApi(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      // Com um formulário aberto, não desloga: logout navega para /login, e
      // navegar fecha os diálogos, levando junto o que estava sendo digitado.
      // Quem chamou recebe o 401 e resolve — o ReautenticacaoService pede o
      // login de novo por cima do formulário e refaz o salvamento.
      if (
        err.status === 401 &&
        !ehRotaDeAutenticacao(req.url) &&
        dialog.openDialogs.length === 0
      ) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
