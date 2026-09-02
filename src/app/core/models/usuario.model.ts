export type Papel = 'DIRETORA' | 'PROFESSORA';

export interface Usuario {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string; // ISO date
  papel: Papel;
  escolaId: string;
}

/** Professora como aparece na listagem da diretora (sem senha). */
export interface ProfessoraDetalhe {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  totalTurmas: number;
}

/** Cadastro de professora feito pela diretora. */
export interface ProfessoraCreate {
  nome: string;
  cpf: string;
  dataNascimento: string;
  senha: string;
}

/** Edição de professora — senha opcional (em branco = não altera). */
export interface ProfessoraUpdate {
  nome: string;
  cpf: string;
  dataNascimento: string;
  senha?: string;
}

/** Cadastro inicial: cria a diretora e a escola juntas. */
export interface CadastroInicial {
  diretora: {
    nome: string;
    cpf: string;
    dataNascimento: string;
    senha: string;
  };
  escola: {
    nome: string;
    endereco: string;
  };
}
