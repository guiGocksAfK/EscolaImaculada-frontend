/** C = compareceu, F = falta, D = desistente */
export type StatusDia = 'C' | 'F' | 'D';

export interface RegistroChamada {
  id: string;
  turmaId: string;
  alunoId: string;
  data: string; // ISO date (YYYY-MM-DD)
  status: StatusDia;
}

/** Chamada de um dia inteiro para uma turma. */
export interface ChamadaDia {
  turmaId: string;
  data: string;
  registros: Array<Pick<RegistroChamada, 'alunoId' | 'status'>>;
}

/** Visão mensal para exportação/impressão. */
export interface ChamadaMensal {
  turmaId: string;
  ano: number;
  mes: number; // 1-12
  dias: string[]; // datas com aula no mês
  linhas: Array<{
    alunoId: string;
    alunoNome: string;
    porDia: Record<string, StatusDia | null>;
    totalFaltas: number;
  }>;
}
