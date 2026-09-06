/**
 * O campo `conteudo` do registro é um texto único no backend — não dá pra
 * mudar o schema só no front. Em vez de um textarea livre, guiamos o
 * preenchimento pelos campos de experiência da BNCC pra Educação Infantil e
 * serializamos tudo num texto formatado (que ainda é só uma string comum
 * pro backend). `parseConteudo` faz o caminho inverso pra reabrir o
 * registro em edição; texto que não bate com nenhum rótulo conhecido
 * (registros antigos, digitados livremente) cai em `outras`, sem perder
 * nada.
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

export function serializarConteudo(c: CamposConteudo): string {
  const partes: string[] = [];
  if (c.disciplina.trim()) partes.push(`Conteúdo: ${c.disciplina.trim()}`);
  for (const campo of CAMPOS_EXPERIENCIA) {
    const valor = c[campo.chave].trim();
    if (valor) partes.push(`${campo.rotulo}: ${valor}`);
  }
  if (c.outras.trim()) partes.push(c.outras.trim());
  return partes.join('\n\n');
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
