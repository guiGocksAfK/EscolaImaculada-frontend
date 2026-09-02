export interface RegistroConteudo {
  id: string;
  turmaId: string;
  data: string; // ISO date
  conteudo: string; // texto livre
}

export type RegistroConteudoCreate = Omit<RegistroConteudo, 'id'>;
