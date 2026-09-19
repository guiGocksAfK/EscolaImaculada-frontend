import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { ReautenticarDialog } from './reautenticar-dialog';

/**
 * Salvamento que sobrevive à sessão expirando no meio do trabalho.
 *
 * O cenário: a professora entra às 7h, o token vale 8h, às 15h ela termina
 * uma avaliação longa e clica em salvar. Sem isto, o 401 derrubava a sessão
 * e o texto ia junto. Com isto, o login é pedido POR CIMA do formulário (que
 * nunca fecha) e o salvamento é refeito sozinho assim que ela entra.
 */
@Injectable({ providedIn: 'root' })
export class ReautenticacaoService {
  private readonly dialog = inject(MatDialog);

  /**
   * Roda `operacao`; se ela voltar 401, pede o login e roda de novo. Recebe
   * uma função (e não o Observable pronto) justamente para poder refazer a
   * requisição depois do login, já com o token novo.
   */
  executar<T>(operacao: () => Observable<T>): Observable<T> {
    return operacao().pipe(
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
          return throwError(() => err);
        }
        return this.dialog
          .open<ReautenticarDialog, void, boolean>(ReautenticarDialog)
          .afterClosed()
          .pipe(
            // Cancelou o login: devolve o 401 original, e o formulário mostra
            // que a sessão expirou — ainda aberto, ainda com o texto.
            switchMap((entrou) => (entrou ? operacao() : throwError(() => err))),
          );
      }),
    );
  }
}
