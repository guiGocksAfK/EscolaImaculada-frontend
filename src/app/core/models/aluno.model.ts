import { Turma } from './turma.model';

export type StatusAluno = 'ATIVO' | 'TRANSFERIDO' | 'DESISTENTE';

export const STATUS_ALUNO: StatusAluno[] = ['ATIVO', 'TRANSFERIDO', 'DESISTENTE'];

export const STATUS_ALUNO_LABEL: Record<StatusAluno, string> = {
  ATIVO: 'Ativo',
  TRANSFERIDO: 'Transferido',
  DESISTENTE: 'Desistente',
};

export interface Aluno {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string; // ISO date (YYYY-MM-DD)
  nomePai: string;
  nomeMae: string;
  localNascimento: string;
  endereco: string;
  turmaId: string;
  turma?: Pick<Turma, 'id' | 'nome'>;
  status: StatusAluno;
}

/** Payload de criação. `status` nasce como ATIVO no back-end. */
export type AlunoCreate = Omit<Aluno, 'id' | 'status' | 'turma'>;

/** Payload de edição — inclui o status. */
export type AlunoUpdate = AlunoCreate & { status: StatusAluno };

export interface AlunosFiltro {
  turmaId?: string;
  status?: StatusAluno;
}
