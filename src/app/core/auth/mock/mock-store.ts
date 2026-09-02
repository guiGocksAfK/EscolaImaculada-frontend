import { Turma } from '../../models/turma.model';
import { Aluno } from '../../models/aluno.model';
import { RegistroChamada } from '../../models/chamada.model';
import { FaltaJustificada } from '../../models/falta-justificada.model';
import { RegistroConteudo } from '../../models/conteudo.model';
import { Avaliacao } from '../../models/avaliacao.model';
import { MOCK_ESCOLA_ID, MOCK_USERS, MockUser } from './mock-users';

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

// ---- Chamada ------------------------------------------------------------

function seedChamada(): RegistroChamada[] {
  const reg = (
    alunoId: string,
    data: string,
    status: RegistroChamada['status'],
  ): RegistroChamada => ({
    id: `rc-${alunoId}-${data}`,
    turmaId: 't-1',
    alunoId,
    data,
    status,
  });

  return [
    reg('a-1', '2026-08-31', 'C'),
    reg('a-2', '2026-08-31', 'C'),
    reg('a-3', '2026-08-31', 'F'),
    reg('a-1', '2026-09-01', 'C'),
    reg('a-2', '2026-09-01', 'F'),
    reg('a-3', '2026-09-01', 'C'),
  ];
}

// ---- Faltas justificadas ----------------------------------------------

function seedFaltas(): FaltaJustificada[] {
  return [
    {
      id: 'fj-1',
      alunoId: 'a-2',
      data: '2026-09-01',
      motivo: 'Consulta médica (atestado apresentado).',
    },
    {
      id: 'fj-2',
      alunoId: 'a-3',
      data: '2026-08-31',
      motivo: 'Viagem em família.',
    },
  ];
}

// ---- Conteúdo das aulas ----------------------------------------------

function seedConteudo(): RegistroConteudo[] {
  return [
    {
      id: 'ct-1',
      turmaId: 't-1',
      data: '2026-08-31',
      conteudo:
        'Roda de conversa sobre o fim de semana. Atividade de coordenação motora com massinha. Contação da história "O Grúfalo".',
    },
    {
      id: 'ct-2',
      turmaId: 't-1',
      data: '2026-09-01',
      conteudo:
        'Reconhecimento das vogais A e E. Pintura com guache do tema "minha família". Brincadeira dirigida no pátio.',
    },
    {
      id: 'ct-3',
      turmaId: 't-2',
      data: '2026-09-01',
      conteudo:
        'Sequência numérica de 1 a 10 com material dourado. Ensaio da apresentação da primavera.',
    },
  ];
}

// ---- Avaliações descritivas -----------------------------------------

function seedAvaliacoes(): Avaliacao[] {
  return [
    {
      id: 'av-1',
      alunoId: 'a-1',
      turmaId: 't-1',
      referencia: '1º semestre 2026',
      texto:
        'Alice demonstra bom entrosamento com os colegas e participa das rodas de conversa com entusiasmo. Está desenvolvendo a coordenação motora fina; recomenda-se continuar as atividades de recorte e pintura em casa.',
    },
    {
      id: 'av-2',
      alunoId: 'a-2',
      turmaId: 't-1',
      referencia: '1º semestre 2026',
      texto:
        'Bento é uma criança curiosa e questionadora. Precisa de apoio para respeitar a vez de falar dos colegas. Reconhece as vogais e demonstra interesse pelas histórias contadas.',
    },
    {
      id: 'av-3',
      alunoId: 'a-4',
      turmaId: 't-2',
      referencia: '1º semestre 2026',
      texto:
        'Davi tem ótima memória para músicas e sequências. Está mais seguro na socialização do que no início do ano. Acompanha bem as atividades de contagem até 10.',
    },
  ];
}

export const mockStore = {
  usuarios: {
    all: (): MockUser[] => load('usuarios', () => MOCK_USERS.map((u) => ({ ...u }))),
    replace: (dados: MockUser[]): void => save('usuarios', dados),
  },
  turmas: {
    all: (): Turma[] => load('turmas', seedTurmas),
    replace: (dados: Turma[]): void => save('turmas', dados),
  },
  alunos: {
    all: (): Aluno[] => load('alunos', seedAlunos),
    replace: (dados: Aluno[]): void => save('alunos', dados),
  },
  chamada: {
    all: (): RegistroChamada[] => load('chamada', seedChamada),
    replace: (dados: RegistroChamada[]): void => save('chamada', dados),
  },
  faltasJustificadas: {
    all: (): FaltaJustificada[] => load('faltasJustificadas', seedFaltas),
    replace: (dados: FaltaJustificada[]): void =>
      save('faltasJustificadas', dados),
  },
  conteudo: {
    all: (): RegistroConteudo[] => load('conteudo', seedConteudo),
    replace: (dados: RegistroConteudo[]): void => save('conteudo', dados),
  },
  avaliacoes: {
    all: (): Avaliacao[] => load('avaliacoes', seedAvaliacoes),
    replace: (dados: Avaliacao[]): void => save('avaliacoes', dados),
  },
};
