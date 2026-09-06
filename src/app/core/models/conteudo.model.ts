import { Turma } from './turma.model';

/** Campos de experiência da BNCC. Opcionais: ao menos um vem preenchido. */
export interface CamposBncc {
  disciplina?: string | null;
  euOutroNos?: string | null;
  corpoGestos?: string | null;
  tracosSons?: string | null;
  escutaFala?: string | null;
  espacoTempo?: string | null;
  outras?: string | null;
}

export interface RegistroConteudo extends CamposBncc {
  id: string;
  turmaId: string;
  turma?: Pick<Turma, 'id' | 'nome'>;
  data: string; // ISO date (YYYY-MM-DD)
  /** Texto renderizado pelo servidor a partir dos campos — exibição / busca. */
  conteudo: string;
}

/** O que o front envia: campos estruturados. O `conteudo` é gerado no back. */
export interface RegistroConteudoCreate extends CamposBncc {
  turmaId: string;
  data: string;
}

export interface ConteudoFiltro {
  turmaId?: string;
}
