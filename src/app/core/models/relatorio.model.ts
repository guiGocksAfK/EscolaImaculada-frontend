export interface AvaliacaoResumo {
  referencia: string;
  texto: string;
}

/** Linha do resumo final por aluno (faltas, presenças, avaliação). */
export interface ResumoAluno {
  alunoId: string;
  alunoNome: string;
  presencas: number;
  faltas: number;
  faltasJustificadas: number;
  avaliacoes: AvaliacaoResumo[];
}

export interface RelatorioResumo {
  turmaId: string;
  turmaNome: string;
  ano: number;
  diasLancados: number;
  linhas: ResumoAluno[];
}
