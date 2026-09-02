export interface Avaliacao {
  id: string;
  alunoId: string;
  turmaId: string;
  texto: string; // avaliação descritiva, texto livre
  referencia: string; // período/data de referência (ex: "1º semestre 2026")
}

export type AvaliacaoCreate = Omit<Avaliacao, 'id'>;
