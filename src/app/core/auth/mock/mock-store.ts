import { Turma } from '../../models/turma.model';
import { MOCK_ESCOLA_ID, MOCK_USERS } from './mock-users';

/**
 * "Banco" fake em localStorage para os módulos funcionarem sem back-end.
 * Cada coleção tem uma chave própria; os dados sobrevivem ao reload.
 * Remover junto com os mock interceptors quando a API real entrar.
 */

const PREFIX = 'ei.mock.';

function load<T>(colecao: string, seed: () => T[]): T[] {
  const raw = localStorage.getItem(PREFIX + colecao);
  if (raw) {
    try {
      return JSON.parse(raw) as T[];
    } catch {
      /* cai no seed */
    }
  }
  const inicial = seed();
  localStorage.setItem(PREFIX + colecao, JSON.stringify(inicial));
  return inicial;
}

function save<T>(colecao: string, dados: T[]): void {
  localStorage.setItem(PREFIX + colecao, JSON.stringify(dados));
}

// ---- Turmas -----------------------------------------------------------------

function seedTurmas(): Turma[] {
  const [, joana, ana] = MOCK_USERS; // [diretora, professora, professora-2]
  return [
    {
      id: 't-1',
      nome: 'Infantil 4 - Manhã',
      periodo: 'MANHA',
      anoLetivo: 2026,
      professoraId: joana.id,
      escolaId: MOCK_ESCOLA_ID,
    },
    {
      id: 't-2',
      nome: 'Infantil 5 - Tarde',
      periodo: 'TARDE',
      anoLetivo: 2026,
      professoraId: joana.id,
      escolaId: MOCK_ESCOLA_ID,
    },
    {
      id: 't-3',
      nome: 'Infantil 3 - Integral',
      periodo: 'INTEGRAL',
      anoLetivo: 2026,
      professoraId: ana.id,
      escolaId: MOCK_ESCOLA_ID,
    },
  ];
}

export const mockStore = {
  turmas: {
    all: (): Turma[] => load('turmas', seedTurmas),
    replace: (dados: Turma[]): void => save('turmas', dados),
  },
};
