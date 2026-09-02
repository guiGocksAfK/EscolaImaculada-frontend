import { Aluno } from './aluno.model';
import { Turma } from './turma.model';

export interface Avaliacao {
  id: string;
  alunoId: string;
  aluno?: Pick<Aluno, 'id' | 'nome'>;
  turmaId: string;
  turma?: Pick<Turma, 'id' | 'nome'>;
  texto: string; // avaliação descritiva, texto livre (não é nota nem conceito)
  referencia: string; // período de referência (ex: "1º semestre 2026")
}

export type AvaliacaoCreate = Omit<Avaliacao, 'id' | 'aluno' | 'turma'>;

export interface AvaliacoesFiltro {
  turmaId?: string;
  alunoId?: string;
}
