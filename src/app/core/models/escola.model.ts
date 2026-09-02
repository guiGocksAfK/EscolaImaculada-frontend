export interface Escola {
  id: string;
  nome: string;
  endereco: string;
}

export type EscolaCreate = Omit<Escola, 'id'>;
