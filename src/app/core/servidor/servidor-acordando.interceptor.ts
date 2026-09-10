import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { finalize, retry, throwError, timeout, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ServidorAcordandoService } from './servidor-acordando.service';

/** Chamada para a nossa própria API (não para terceiros). */
function ehChamadaDaApi(url: string): boolean {
  return (
    url.startsWith(environment.apiUrl) ||
    url.startsWith('/') ||
    url.startsWith(`${location.origin}/`)
  );
}

/**
 * O erro parece "servidor ainda ligando" (e não uma resposta real da API)?
 * - status 0: sem resposta — rede/CORS/instância inacessível.
 * - 502/503/504: o proxy do Render enquanto a instância sobe.
 * - TimeoutError: a tentativa passou do teto e foi cortada.
 */
function pareceServidorDormindo(err: unknown): boolean {
  if (err instanceof HttpErrorResponse) {
    return (
      err.status === 0 ||
      err.status === 502 ||
      err.status === 503 ||
      err.status === 504
    );
  }
  return (err as { name?: string } | null)?.name === 'TimeoutError';
}

/** Depois disso sem resposta, mostra o overlay. */
const LIMITE_ATRASO_MS = 3_000;
/** Corta uma tentativa travada e parte para a próxima. */
const TIMEOUT_TENTATIVA_MS = 30_000;
/** Intervalo entre tentativas — é o que mantém o Render acordando. */
const INTERVALO_RETRY_MS = 5_000;
/** Teto de tentativas antes de desistir e propagar o erro. */
const MAX_TENTATIVAS = 12;

/**
 * Segura a experiência durante o cold start do backend: se a resposta
 * demora, sobe um overlay e refaz a requisição a cada 5s até o servidor
 * responder. A requisição original resolve normalmente quando ele acorda,
 * então o fluxo do usuário (login, carregar tela…) continua sozinho.
 */
export const servidorAcordandoInterceptor: HttpInterceptorFn = (req, next) => {
  if (!ehChamadaDaApi(req.url)) return next(req);

  const estado = inject(ServidorAcordandoService);

  let marcou = false;
  const marcar = (): void => {
    if (marcou) return;
    marcou = true;
    estado.marcarPresa();
  };
  const atrasoTimer = setTimeout(marcar, LIMITE_ATRASO_MS);

  return next(req).pipe(
    timeout(TIMEOUT_TENTATIVA_MS),
    retry({
      count: MAX_TENTATIVAS,
      delay: (err) => {
        // Erro "de verdade" (4xx, 5xx da aplicação): não insiste.
        if (!pareceServidorDormindo(err)) return throwError(() => err);
        // Está dormindo mesmo: mostra o overlay já (mesmo antes dos 3s)
        // e agenda a próxima tentativa.
        marcar();
        estado.registrarTentativa();
        return timer(INTERVALO_RETRY_MS);
      },
    }),
    finalize(() => {
      clearTimeout(atrasoTimer);
      if (marcou) estado.liberarPresa();
    }),
  );
};
