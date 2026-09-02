export type StatusAluno = 'ATIVO' | 'TRANSFERIDO' | 'DESISTENTE';

export interface Aluno {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string; // ISO date
  nomePai: string;
  nomeMae: string;
  localNascimento: string;
  endereco: string;
  turmaId: string;
  status: StatusAluno;
}

export type AlunoCreate = Omit<Aluno, 'id' | 'status'>;
