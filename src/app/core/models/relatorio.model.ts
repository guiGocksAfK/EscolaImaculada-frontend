import { ChamadaMensal } from './chamada.model';
import { StatusAluno } from './aluno.model';

export interface AvaliacaoResumo {
  referencia: string;
  texto: string;
}

/** Linha do resumo final por aluno (faltas, presenças, avaliação). */
export interface ResumoAluno {
  alunoId: string;
  alunoNome: string;
  presencas: number;
  faltas: number;
  faltasJustificadas: number;
  avaliacoes: AvaliacaoResumo[];
}

export interface RelatorioResumo {
  turmaId: string;
  turmaNome: string;
  ano: number;
  diasLancados: number;
  linhas: ResumoAluno[];
}

/** Registro de classe do semestre, já montado pelo backend. */
export interface RegistroSemestralResponse {
  turmaId: string;
  turmaNome: string;
  ano: number;
  semestre: 1 | 2;
  responsavelNome: string;
  meses: ChamadaMensal[];
  alunos: Array<{
    id: string;
    nome: string;
    status: StatusAluno;
    dataNascimento: string;
  }>;
  conteudos: Array<{ id: string; data: string; conteudo: string }>;
  justificadas: Array<{
    alunoId: string;
    data: string;
    motivo: string;
    aluno?: { nome: string };
  }>;
  avaliacoes: Array<{
    alunoId: string;
    referencia: string;
    texto: string;
    aluno?: { nome: string };
  }>;
  atendimentos: number;
  faltasPorAluno: Record<string, number>;
}
