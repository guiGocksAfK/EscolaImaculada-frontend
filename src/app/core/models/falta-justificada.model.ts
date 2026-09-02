import { Aluno } from './aluno.model';

export interface FaltaJustificada {
  id: string;
  alunoId: string;
  aluno?: Pick<Aluno, 'id' | 'nome' | 'turmaId'>;
  data: string; // ISO date
  motivo: string; // texto livre: atestado, viagem, doença, etc.
}

export type FaltaJustificadaCreate = Omit<FaltaJustificada, 'id' | 'aluno'>;

export interface FaltasFiltro {
  turmaId?: string;
  alunoId?: string;
}
