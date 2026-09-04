export interface Escola {
  id: string;
  nome: string;
  endereco: string;
}

export type EscolaCreate = Omit<Escola, 'id'>;

/** Payload de edição dos dados da escola (feito pela diretora). */
export type EscolaUpdate = EscolaCreate;
