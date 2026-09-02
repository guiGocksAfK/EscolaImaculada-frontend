import { Turma } from './turma.model';

export interface RegistroConteudo {
  id: string;
  turmaId: string;
  turma?: Pick<Turma, 'id' | 'nome'>;
  data: string; // ISO date (YYYY-MM-DD)
  conteudo: string; // texto livre — o que foi dado na aula
}

export type RegistroConteudoCreate = Omit<RegistroConteudo, 'id' | 'turma'>;

export interface ConteudoFiltro {
  turmaId?: string;
}
