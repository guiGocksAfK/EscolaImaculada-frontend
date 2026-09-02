import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpParams,
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
import {
  Aluno,
  AlunoCreate,
  AlunoUpdate,
  StatusAluno,
} from '../../models/aluno.model';
import {
  ChamadaDia,
  ChamadaMensal,
  RegistroChamada,
  StatusDia,
} from '../../models/chamada.model';
import {
  FaltaJustificada,
  FaltaJustificadaCreate,
} from '../../models/falta-justificada.model';
import { MOCK_USERS } from './mock-users';
import { mockStore } from './mock-store';

/**
 * Responde às chamadas REST dos módulos (turmas, professoras, alunos, ...)
 * usando o "banco" em localStorage. Só age se `environment.useMock` for true.
 * Remover este arquivo (e o registro em app.config.ts) quando a API real entrar.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMock || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  // req.url não carrega a query string; os filtros vêm em req.params.
  const rawPath = req.url.slice(environment.apiUrl.length).split('?')[0];
  const claims = lerClaims(req.headers.get('Authorization'));

  const handler = rotas(rawPath, req.method);
  if (!handler || !claims) {
    return next(req);
  }

  return handler(claims, req.body, req.params).pipe(
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
  params: HttpParams,
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

// ---- helpers de domínio --------------------------------------------------

function comProfessora(t: Turma): Turma {
  const p = MOCK_USERS.find((u) => u.id === t.professoraId);
  return { ...t, professora: p ? { id: p.id, nome: p.nome } : undefined };
}

function comTurma(a: Aluno): Aluno {
  const t = mockStore.turmas.all().find((x) => x.id === a.turmaId);
  return { ...a, turma: t ? { id: t.id, nome: t.nome } : undefined };
}

/** Ids das turmas visíveis para o usuário (professora: só as dela). */
function turmasDoUsuario(claims: Claims): Set<string> {
  const todas = mockStore.turmas.all();
  const minhas =
    claims.papel === 'DIRETORA'
      ? todas
      : todas.filter((t) => t.professoraId === claims.sub);
  return new Set(minhas.map((t) => t.id));
}

// ---- roteador -----------------------------------------------------------

function rotas(path: string, method: string): Handler | null {
  return (
    rotaProfessoras(path, method) ??
    rotaTurmas(path, method) ??
    rotaAlunos(path, method) ??
    rotaChamada(path, method) ??
    rotaFaltas(path, method)
  );
}

function rotaProfessoras(path: string, method: string): Handler | null {
  if (path === '/professoras' && method === 'GET') {
    return () =>
      ok(
        MOCK_USERS.filter((u) => u.papel === 'PROFESSORA').map((u) => ({
          id: u.id,
          nome: u.nome,
        })),
      );
  }
  return null;
}

function rotaTurmas(path: string, method: string): Handler | null {
  if (path === '/turmas' && method === 'GET') {
    return (claims) => {
      const todas = mockStore.turmas.all().map(comProfessora);
      const visiveis =
        claims.papel === 'DIRETORA'
          ? todas
          : todas.filter((t) => t.professoraId === claims.sub);
      return ok(visiveis);
    };
  }

  if (path === '/turmas' && method === 'POST') {
    return (claims, body) => {
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

  const m = path.match(/^\/turmas\/([^/]+)$/);
  if (m) {
    const id = m[1];
    if (method === 'PUT') {
      return (claims, body) => {
        if (claims.papel !== 'DIRETORA') return erro(403, 'Sem permissão');
        const lista = mockStore.turmas.all();
        const idx = lista.findIndex((t) => t.id === id);
        if (idx < 0) return erro(404, 'Turma não encontrada');
        lista[idx] = { ...lista[idx], ...(body as TurmaCreate), id };
        mockStore.turmas.replace(lista);
        return ok(comProfessora(lista[idx]));
      };
    }
    if (method === 'DELETE') {
      return (claims) => {
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

function rotaAlunos(path: string, method: string): Handler | null {
  if (path === '/alunos' && method === 'GET') {
    return (claims, _body, params) => {
      const permitidas = turmasDoUsuario(claims);
      const turmaId = params.get('turmaId');
      const status = params.get('status') as StatusAluno | null;

      const lista = mockStore.alunos
        .all()
        .filter((a) => permitidas.has(a.turmaId))
        .filter((a) => !turmaId || a.turmaId === turmaId)
        .filter((a) => !status || a.status === status)
        .map(comTurma)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      return ok(lista);
    };
  }

  if (path === '/alunos' && method === 'POST') {
    return (claims, body) => {
      const dto = body as AlunoCreate;
      if (!turmasDoUsuario(claims).has(dto.turmaId))
        return erro(403, 'Turma fora do seu acesso');
      const novo: Aluno = { ...dto, id: crypto.randomUUID(), status: 'ATIVO' };
      mockStore.alunos.replace([...mockStore.alunos.all(), novo]);
      return ok(comTurma(novo), 201);
    };
  }

  const mId = path.match(/^\/alunos\/([^/]+)$/);
  if (mId) {
    const id = mId[1];

    if (method === 'PUT') {
      return (claims, body) => {
        const lista = mockStore.alunos.all();
        const idx = lista.findIndex((a) => a.id === id);
        if (idx < 0) return erro(404, 'Aluno não encontrado');
        const permitidas = turmasDoUsuario(claims);
        const dto = body as AlunoUpdate;
        if (!permitidas.has(lista[idx].turmaId) || !permitidas.has(dto.turmaId))
          return erro(403, 'Aluno fora do seu acesso');
        lista[idx] = { ...lista[idx], ...dto, id };
        mockStore.alunos.replace(lista);
        return ok(comTurma(lista[idx]));
      };
    }

    if (method === 'DELETE') {
      return (claims) => {
        if (claims.papel !== 'DIRETORA')
          return erro(403, 'Somente a diretora pode excluir alunos');
        const lista = mockStore.alunos.all();
        if (!lista.some((a) => a.id === id))
          return erro(404, 'Aluno não encontrado');
        mockStore.alunos.replace(lista.filter((a) => a.id !== id));
        return ok(null, 204);
      };
    }
  }

  const mStatus = path.match(/^\/alunos\/([^/]+)\/status$/);
  if (mStatus && method === 'PATCH') {
    const id = mStatus[1];
    return (claims, body) => {
      const lista = mockStore.alunos.all();
      const idx = lista.findIndex((a) => a.id === id);
      if (idx < 0) return erro(404, 'Aluno não encontrado');
      if (!turmasDoUsuario(claims).has(lista[idx].turmaId))
        return erro(403, 'Aluno fora do seu acesso');
      lista[idx] = {
        ...lista[idx],
        status: (body as { status: StatusAluno }).status,
      };
      mockStore.alunos.replace(lista);
      return ok(comTurma(lista[idx]));
    };
  }

  return null;
}

function rotaChamada(path: string, method: string): Handler | null {
  // GET /chamada?turmaId&data  -> registros do dia
  if (path === '/chamada' && method === 'GET') {
    return (claims, _body, params) => {
      const turmaId = params.get('turmaId') ?? '';
      const data = params.get('data') ?? '';
      if (!turmasDoUsuario(claims).has(turmaId))
        return erro(403, 'Turma fora do seu acesso');
      const registros = mockStore.chamada
        .all()
        .filter((r) => r.turmaId === turmaId && r.data === data)
        .map((r) => ({ alunoId: r.alunoId, status: r.status }));
      return ok<ChamadaDia>({ turmaId, data, registros });
    };
  }

  // PUT /chamada  -> upsert do dia inteiro
  if (path === '/chamada' && method === 'PUT') {
    return (claims, body) => {
      const dia = body as ChamadaDia;
      if (!turmasDoUsuario(claims).has(dia.turmaId))
        return erro(403, 'Turma fora do seu acesso');
      const outros = mockStore.chamada
        .all()
        .filter((r) => !(r.turmaId === dia.turmaId && r.data === dia.data));
      const novos: RegistroChamada[] = dia.registros.map((r) => ({
        id: `rc-${r.alunoId}-${dia.data}`,
        turmaId: dia.turmaId,
        alunoId: r.alunoId,
        data: dia.data,
        status: r.status,
      }));
      mockStore.chamada.replace([...outros, ...novos]);
      return ok<ChamadaDia>(dia);
    };
  }

  // GET /chamada/mensal?turmaId&ano&mes
  if (path === '/chamada/mensal' && method === 'GET') {
    return (claims, _body, params) => {
      const turmaId = params.get('turmaId') ?? '';
      const ano = Number(params.get('ano'));
      const mes = Number(params.get('mes'));
      if (!turmasDoUsuario(claims).has(turmaId))
        return erro(403, 'Turma fora do seu acesso');

      const prefixo = `${ano}-${`${mes}`.padStart(2, '0')}`;
      const registros = mockStore.chamada
        .all()
        .filter((r) => r.turmaId === turmaId && r.data.startsWith(prefixo));
      const dias = [...new Set(registros.map((r) => r.data))].sort();

      const alunos = mockStore.alunos
        .all()
        .filter((a) => a.turmaId === turmaId && a.status === 'ATIVO')
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      const linhas = alunos.map((a) => {
        const porDia: Record<string, StatusDia | null> = {};
        let totalFaltas = 0;
        for (const d of dias) {
          const r = registros.find(
            (x) => x.alunoId === a.id && x.data === d,
          );
          porDia[d] = r ? r.status : null;
          if (r?.status === 'F') totalFaltas++;
        }
        return { alunoId: a.id, alunoNome: a.nome, porDia, totalFaltas };
      });

      return ok<ChamadaMensal>({ turmaId, ano, mes, dias, linhas });
    };
  }

  return null;
}

function rotaFaltas(path: string, method: string): Handler | null {
  const comAluno = (f: FaltaJustificada): FaltaJustificada => {
    const a = mockStore.alunos.all().find((x) => x.id === f.alunoId);
    return {
      ...f,
      aluno: a ? { id: a.id, nome: a.nome, turmaId: a.turmaId } : undefined,
    };
  };

  if (path === '/faltas-justificadas' && method === 'GET') {
    return (claims, _body, params) => {
      const permitidas = turmasDoUsuario(claims);
      const turmaId = params.get('turmaId');
      const alunoId = params.get('alunoId');
      const alunosPorId = new Map(
        mockStore.alunos.all().map((a) => [a.id, a]),
      );

      const lista = mockStore.faltasJustificadas
        .all()
        .filter((f) => {
          const a = alunosPorId.get(f.alunoId);
          return !!a && permitidas.has(a.turmaId);
        })
        .filter((f) => !alunoId || f.alunoId === alunoId)
        .filter(
          (f) => !turmaId || alunosPorId.get(f.alunoId)?.turmaId === turmaId,
        )
        .map(comAluno)
        .sort((a, b) => b.data.localeCompare(a.data));

      return ok(lista);
    };
  }

  if (path === '/faltas-justificadas' && method === 'POST') {
    return (claims, body) => {
      const dto = body as FaltaJustificadaCreate;
      const a = mockStore.alunos.all().find((x) => x.id === dto.alunoId);
      if (!a || !turmasDoUsuario(claims).has(a.turmaId))
        return erro(403, 'Aluno fora do seu acesso');
      const nova: FaltaJustificada = { ...dto, id: crypto.randomUUID() };
      mockStore.faltasJustificadas.replace([
        ...mockStore.faltasJustificadas.all(),
        nova,
      ]);
      return ok(comAluno(nova), 201);
    };
  }

  const mId = path.match(/^\/faltas-justificadas\/([^/]+)$/);
  if (mId) {
    const id = mId[1];
    const lista = () => mockStore.faltasJustificadas.all();
    const podeMexer = (claims: Claims, alunoId: string) => {
      const a = mockStore.alunos.all().find((x) => x.id === alunoId);
      return !!a && turmasDoUsuario(claims).has(a.turmaId);
    };

    if (method === 'PUT') {
      return (claims, body) => {
        const dados = lista();
        const idx = dados.findIndex((f) => f.id === id);
        if (idx < 0) return erro(404, 'Registro não encontrado');
        const dto = body as FaltaJustificadaCreate;
        if (!podeMexer(claims, dto.alunoId) || !podeMexer(claims, dados[idx].alunoId))
          return erro(403, 'Fora do seu acesso');
        dados[idx] = { ...dados[idx], ...dto, id };
        mockStore.faltasJustificadas.replace(dados);
        return ok(comAluno(dados[idx]));
      };
    }

    if (method === 'DELETE') {
      return (claims) => {
        const dados = lista();
        const alvo = dados.find((f) => f.id === id);
        if (!alvo) return erro(404, 'Registro não encontrado');
        if (!podeMexer(claims, alvo.alunoId))
          return erro(403, 'Fora do seu acesso');
        mockStore.faltasJustificadas.replace(dados.filter((f) => f.id !== id));
        return ok(null, 204);
      };
    }
  }

  return null;
}
