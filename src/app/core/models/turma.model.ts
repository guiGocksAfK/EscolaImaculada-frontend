import { Usuario } from './usuario.model';

export type Periodo = 'MANHA' | 'TARDE' | 'INTEGRAL';

export interface Turma {
  id: string;
  nome: string; // ex: "Infantil 5 - Tarde"
  periodo: Periodo;
  anoLetivo: number;
  professoraId: string;
  professora?: Pick<Usuario, 'id' | 'nome'>;
  escolaId: string;
}

export type TurmaCreate = Omit<Turma, 'id' | 'professora'>;
