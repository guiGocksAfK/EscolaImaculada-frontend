import { Usuario } from './usuario.model';

export type Periodo = 'MANHA' | 'TARDE' | 'INTEGRAL';

export const PERIODOS: Periodo[] = ['MANHA', 'TARDE', 'INTEGRAL'];

export const PERIODO_LABEL: Record<Periodo, string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  INTEGRAL: 'Integral',
};

export interface Turma {
  id: string;
  nome: string; // ex: "Infantil 5 - Tarde"
  periodo: Periodo;
  anoLetivo: number;
  professoraId: string;
  professora?: Pick<Usuario, 'id' | 'nome'>;
  escolaId: string;
}

/** Payload de criação/edição. `escolaId` é derivado do usuário autenticado no back-end. */
export type TurmaCreate = Omit<Turma, 'id' | 'professora' | 'escolaId'>;
