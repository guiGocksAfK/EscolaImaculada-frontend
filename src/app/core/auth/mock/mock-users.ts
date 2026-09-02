import { Papel } from '../../models/usuario.model';

/**
 * Usuários fake para desenvolvimento sem back-end.
 * Ligado/desligado por `environment.useMock`. Remover junto com o
 * mock-auth.interceptor quando a API real entrar.
 */
export interface MockUser {
  id: string;
  nome: string;
  cpf: string; // só dígitos
  senha: string;
  dataNascimento: string; // ISO date
  papel: Papel;
  escolaId: string;
}

export const MOCK_ESCOLA_ID = 'escola-imaculada';

export const MOCK_USERS: MockUser[] = [
  {
    id: 'u-diretora',
    nome: 'Maria Aparecida',
    cpf: '11111111111',
    senha: '123456',
    dataNascimento: '1978-04-12',
    papel: 'DIRETORA',
    escolaId: MOCK_ESCOLA_ID,
  },
  {
    id: 'u-professora',
    nome: 'Joana Silva',
    cpf: '22222222222',
    senha: '123456',
    dataNascimento: '1990-08-25',
    papel: 'PROFESSORA',
    escolaId: MOCK_ESCOLA_ID,
  },
  {
    id: 'u-professora-2',
    nome: 'Ana Souza',
    cpf: '33333333333',
    senha: '123456',
    dataNascimento: '1985-11-03',
    papel: 'PROFESSORA',
    escolaId: MOCK_ESCOLA_ID,
  },
];

/** Credenciais pré-preenchidas na tela de login em modo mock. */
export const MOCK_LOGIN_DEFAULT = {
  cpf: '111.111.111-11',
  senha: '123456',
};

function base64url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Gera um JWT *sem assinatura válida* — serve só pro front (jwt-decode não
 * verifica assinatura). Nunca usar isso no back-end.
 */
export function fakeJwt(user: MockUser): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      sub: user.id,
      nome: user.nome,
      papel: user.papel,
      escolaId: user.escolaId,
      iat: now,
      exp: now + 8 * 60 * 60, // 8 horas
    }),
  );
  return `${header}.${payload}.mock-signature`;
}
