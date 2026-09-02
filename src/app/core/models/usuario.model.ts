export type Papel = 'DIRETORA' | 'PROFESSORA';

export interface Usuario {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string; // ISO date
  papel: Papel;
  escolaId: string;
}

/** Cadastro de professora feito pela diretora. */
export interface ProfessoraCreate {
  nome: string;
  cpf: string;
  dataNascimento: string;
  senha: string;
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
