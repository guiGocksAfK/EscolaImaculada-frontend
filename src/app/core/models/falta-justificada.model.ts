export interface FaltaJustificada {
  id: string;
  alunoId: string;
  data: string; // ISO date
  motivo: string; // texto livre: atestado, viagem, doença, etc.
}

export type FaltaJustificadaCreate = Omit<FaltaJustificada, 'id'>;
