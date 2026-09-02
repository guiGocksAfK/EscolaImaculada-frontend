import { Turma } from '../../models/turma.model';
import { Aluno } from '../../models/aluno.model';
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

// ---- Alunos ---------------------------------------------------------------

function seedAlunos(): Aluno[] {
  const base = (
    id: string,
    nome: string,
    turmaId: string,
    dataNascimento: string,
    nomeMae: string,
    nomePai: string,
    status: Aluno['status'] = 'ATIVO',
  ): Aluno => ({
    id,
    nome,
    cpf: '',
    dataNascimento,
    nomeMae,
    nomePai,
    localNascimento: 'Curitiba - PR',
    endereco: 'Rua das Flores, 100 - Curitiba/PR',
    turmaId,
    status,
  });

  return [
    base('a-1', 'Alice Martins', 't-1', '2021-03-14', 'Fernanda Martins', 'Rafael Martins'),
    base('a-2', 'Bento Oliveira', 't-1', '2021-07-02', 'Carla Oliveira', 'Diego Oliveira'),
    base('a-3', 'Cecília Rocha', 't-1', '2021-11-20', 'Patrícia Rocha', 'Bruno Rocha'),
    base('a-4', 'Davi Nunes', 't-2', '2020-05-09', 'Juliana Nunes', 'Marcos Nunes'),
    base('a-5', 'Elisa Prado', 't-2', '2020-09-27', 'Renata Prado', 'André Prado', 'TRANSFERIDO'),
    base('a-6', 'Felipe Castro', 't-3', '2022-01-30', 'Bianca Castro', 'Tiago Castro'),
    base('a-7', 'Gabriela Lima', 't-3', '2022-04-18', 'Sônia Lima', 'Paulo Lima'),
  ];
}

export const mockStore = {
  turmas: {
    all: (): Turma[] => load('turmas', seedTurmas),
    replace: (dados: Turma[]): void => save('turmas', dados),
  },
  alunos: {
    all: (): Aluno[] => load('alunos', seedAlunos),
    replace: (dados: Aluno[]): void => save('alunos', dados),
  },
};
