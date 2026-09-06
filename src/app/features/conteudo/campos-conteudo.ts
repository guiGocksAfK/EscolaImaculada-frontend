/**
 * Campos de experiência da BNCC (Educação Infantil) que compõem um registro
 * de conteúdo. O backend agora guarda esses campos estruturados e gera o
 * texto de exibição (`conteudo`) a partir deles. `parseConteudo` só serve
 * de fallback para registros antigos, que só têm o texto.
 */
export interface CamposConteudo {
  disciplina: string;
  euOutroNos: string;
  corpoGestos: string;
  tracosSons: string;
  escutaFala: string;
  espacoTempo: string;
  outras: string;
}

export type ChaveCampoExperiencia = Exclude<
  keyof CamposConteudo,
  'disciplina' | 'outras'
>;

export const CAMPOS_EXPERIENCIA: Array<{
  chave: ChaveCampoExperiencia;
  rotulo: string;
  placeholder: string;
}> = [
  {
    chave: 'euOutroNos',
    rotulo: 'O eu, o outro e o nós',
    placeholder: 'Roda de conversa, socialização, autonomia…',
  },
  {
    chave: 'corpoGestos',
    rotulo: 'Corpo, gestos e movimentos',
    placeholder: 'Atividades motoras, pintura, recorte, colagem…',
  },
  {
    chave: 'tracosSons',
    rotulo: 'Traços, sons, cores e formas',
    placeholder: 'Desenho, música, artes visuais…',
  },
  {
    chave: 'escutaFala',
    rotulo: 'Escuta, fala, pensamento e imaginação',
    placeholder: 'Leitura, escrita, histórias, linguagem oral…',
  },
  {
    chave: 'espacoTempo',
    rotulo: 'Espaço, tempo, quantidades, relações e transformações',
    placeholder: 'Matemática, números, noções espaciais…',
  },
];

export function camposVazios(): CamposConteudo {
  return {
    disciplina: '',
    euOutroNos: '',
    corpoGestos: '',
    tracosSons: '',
    escutaFala: '',
    espacoTempo: '',
    outras: '',
  };
}

export function camposPreenchidos(c: CamposConteudo): boolean {
  return (
    !!c.outras.trim() ||
    CAMPOS_EXPERIENCIA.some((campo) => !!c[campo.chave].trim())
  );
}

/** Campos de um registro: usa os estruturados; cai no parser só se o
 * registro for antigo (nenhum campo estruturado preenchido). */
export function camposDoRegistro(r: {
  disciplina?: string | null;
  euOutroNos?: string | null;
  corpoGestos?: string | null;
  tracosSons?: string | null;
  escutaFala?: string | null;
  espacoTempo?: string | null;
  outras?: string | null;
  conteudo?: string;
}): CamposConteudo {
  const c: CamposConteudo = {
    disciplina: r.disciplina ?? '',
    euOutroNos: r.euOutroNos ?? '',
    corpoGestos: r.corpoGestos ?? '',
    tracosSons: r.tracosSons ?? '',
    escutaFala: r.escutaFala ?? '',
    espacoTempo: r.espacoTempo ?? '',
    outras: r.outras ?? '',
  };
  return camposPreenchidos(c) ? c : parseConteudo(r.conteudo ?? '');
}

export function parseConteudo(texto: string): CamposConteudo {
  const resultado = camposVazios();
  const outras: string[] = [];

  for (const paragrafoBruto of texto.split(/\n\s*\n/)) {
    const paragrafo = paragrafoBruto.trim();
    if (!paragrafo) continue;

    const matchDisciplina = paragrafo.match(/^Conte[uú]do:\s*([\s\S]*)$/i);
    if (matchDisciplina && !resultado.disciplina) {
      resultado.disciplina = matchDisciplina[1].trim();
      continue;
    }

    const campo = CAMPOS_EXPERIENCIA.find((c) =>
      paragrafo.toLowerCase().startsWith(`${c.rotulo.toLowerCase()}:`),
    );
    if (campo) {
      resultado[campo.chave] = paragrafo.slice(campo.rotulo.length + 1).trim();
      continue;
    }

    outras.push(paragrafo);
  }

  resultado.outras = outras.join('\n\n');
  return resultado;
}

/** Linhas "rótulo: texto" prontas pra exibir na lista, na ordem da BNCC. */
export function linhasParaExibicao(
  c: CamposConteudo,
): Array<{ rotulo: string; texto: string }> {
  const linhas: Array<{ rotulo: string; texto: string }> = [];
  for (const campo of CAMPOS_EXPERIENCIA) {
    const valor = c[campo.chave].trim();
    if (valor) linhas.push({ rotulo: campo.rotulo, texto: valor });
  }
  if (c.outras.trim()) {
    linhas.push({ rotulo: 'Outras observações', texto: c.outras.trim() });
  }
  return linhas;
}
