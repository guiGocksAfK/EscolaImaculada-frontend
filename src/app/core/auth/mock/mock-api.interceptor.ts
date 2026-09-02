import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import {
  Observable,
  delay,
  dematerialize,
  materialize,
  of,
  throwError,
} from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import { environment } from '../../../../environments/environment';
import { JwtClaims } from '../auth.models';
import { Turma, TurmaCreate } from '../../models/turma.model';
import { MOCK_USERS } from './mock-users';
import { mockStore } from './mock-store';

/**
 * Responde às chamadas REST dos módulos (turmas, professoras, ...) usando o
 * "banco" em localStorage. Só age se `environment.useMock` for true.
 * Remover este arquivo (e o registro em app.config.ts) quando a API real entrar.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMock || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const path = req.url.slice(environment.apiUrl.length);
  const claims = lerClaims(req.headers.get('Authorization'));

  const handler = rotas(path, req.method);
  if (!handler || !claims) {
    return next(req);
  }

  return handler(claims, req.body, path).pipe(
    materialize(),
    delay(400),
    dematerialize(),
  );
};

// ---------------------------------------------------------------------------

type Claims = JwtClaims;
type Handler = (
  claims: Claims,
  body: unknown,
  path: string,
) => Observable<HttpResponse<unknown>>;

function lerClaims(auth: string | null): Claims | null {
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwtDecode<Claims>(auth.slice(7));
  } catch {
    return null;
  }
}

function ok<T>(body: T, status = 200) {
  return of(new HttpResponse<T>({ status, body }));
}

function erro(status: number, message: string) {
  return throwError(
    () => new HttpErrorResponse({ status, error: { message } }),
  );
}

function comProfessora(t: Turma): Turma {
  const p = MOCK_USERS.find((u) => u.id === t.professoraId);
  return { ...t, professora: p ? { id: p.id, nome: p.nome } : undefined };
}

function rotas(path: string, method: string): Handler | null {
  // /professoras
  if (path === '/professoras' && method === 'GET') {
    return () =>
      ok(
        MOCK_USERS.filter((u) => u.papel === 'PROFESSORA').map((u) => ({
          id: u.id,
          nome: u.nome,
        })),
      );
  }

  // /turmas
  if (path === '/turmas' && method === 'GET') {
    return (claims: Claims) => {
      const todas = mockStore.turmas.all().map(comProfessora);
      const visiveis =
        claims.papel === 'DIRETORA'
          ? todas
          : todas.filter((t) => t.professoraId === claims.sub);
      return ok(visiveis);
    };
  }

  if (path === '/turmas' && method === 'POST') {
    return (claims: Claims, body: unknown) => {
      if (claims.papel !== 'DIRETORA') return erro(403, 'Sem permissão');
      const dto = body as TurmaCreate;
      const nova: Turma = {
        ...dto,
        id: crypto.randomUUID(),
        escolaId: claims.escolaId,
      };
      mockStore.turmas.replace([...mockStore.turmas.all(), nova]);
      return ok(comProfessora(nova), 201);
    };
  }

  const matchId = path.match(/^\/turmas\/([^/]+)$/);
  if (matchId) {
    const id = matchId[1];

    if (method === 'PUT') {
      return (claims: Claims, body: unknown) => {
        if (claims.papel !== 'DIRETORA') return erro(403, 'Sem permissão');
        const lista = mockStore.turmas.all();
        const idx = lista.findIndex((t) => t.id === id);
        if (idx < 0) return erro(404, 'Turma não encontrada');
        const atualizada: Turma = { ...lista[idx], ...(body as TurmaCreate), id };
        lista[idx] = atualizada;
        mockStore.turmas.replace(lista);
        return ok(comProfessora(atualizada));
      };
    }

    if (method === 'DELETE') {
      return (claims: Claims) => {
        if (claims.papel !== 'DIRETORA') return erro(403, 'Sem permissão');
        const lista = mockStore.turmas.all();
        if (!lista.some((t) => t.id === id))
          return erro(404, 'Turma não encontrada');
        mockStore.turmas.replace(lista.filter((t) => t.id !== id));
        return ok(null, 204);
      };
    }
  }

  return null;
}
