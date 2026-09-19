import type { jsPDF } from 'jspdf';

/**
 * Identidade visual dos documentos: serifa, preto e branco, cabeçalho
 * centrado e fios finos — a mesma do parecer descritivo.
 *
 * O critério não é estética: esses papéis vão para a pasta da criança, para a
 * secretaria e para a assinatura da diretora. Precisam parecer documento de
 * instituição, não relatório de sistema.
 */

/** Times: vem embutida no jsPDF (nada de fonte de 220 KB no bundle). */
export const FONTE = 'times';

export const MARGEM = { top: 32, left: 14, right: 14, bottom: 16 } as const;

export interface Instituicao {
  nome: string;
  endereco?: string;
}

/**
 * Troca os caracteres que a fonte interna do jsPDF não desenha — traço longo,
 * reticências e ponto médio saem como BURACO no PDF, em silêncio. Descoberto
 * na marra: o título do parecer saía "PRIMEIRO SEMESTRE  2026".
 */
export function texto(s: string): string {
  return (s ?? '')
    .replace(/[‒–—―]/g, '-')
    .replace(/…/g, '...')
    .replace(/[·•]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

export function metadados(doc: jsPDF, titulo: string, escola: Instituicao): void {
  doc.setProperties({
    title: titulo,
    subject: titulo,
    author: escola.nome,
    creator: 'Registro de Classe',
  });
}

export function emitidoEm(): string {
  return new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Cabeçalho institucional da página atual — no máximo uma vez por página,
 * porque o autoTable chama isto de novo a cada página de continuação.
 */
export function criarCabecalho(doc: jsPDF, escola: Instituicao) {
  let ultimaPagina = -1;
  const centro = doc.internal.pageSize.getWidth() / 2;
  const direita = doc.internal.pageSize.getWidth() - MARGEM.right;

  return (titulo: string, subtitulo: string): number => {
    const pagina = doc.getNumberOfPages();
    if (pagina === ultimaPagina) return MARGEM.top;
    ultimaPagina = pagina;

    doc.setTextColor(0);
    doc.setFont(FONTE, 'bold');
    doc.setFontSize(12);
    doc.text(texto(escola.nome.toUpperCase()), centro, 12, { align: 'center' });

    let y = 12;
    if (escola.endereco) {
      y += 4.5;
      doc.setFont(FONTE, 'normal');
      doc.setFontSize(9);
      doc.text(texto(escola.endereco), centro, y, { align: 'center' });
    }

    y += 4;
    doc.setLineWidth(0.4);
    doc.line(MARGEM.left, y, direita, y);

    y += 6;
    doc.setFont(FONTE, 'bold');
    doc.setFontSize(11);
    doc.text(texto(titulo.toUpperCase()), centro, y, { align: 'center' });

    if (subtitulo) {
      y += 5;
      doc.setFont(FONTE, 'normal');
      doc.setFontSize(9.5);
      doc.text(texto(subtitulo), centro, y, { align: 'center' });
    }

    return Math.max(MARGEM.top, y + 5);
  };
}

/** Rodapé com a data de emissão e a paginação. Chamar por último. */
export function rodape(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const emitido = `Emitido em ${emitidoEm()}`;

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont(FONTE, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(texto(emitido), MARGEM.left, altura - 8);
    doc.text(`Página ${i} de ${total}`, largura - MARGEM.right, altura - 8, {
      align: 'right',
    });
  }
}

/**
 * Estilo das tabelas: grade preta fina, cabeçalho em cinza claro e nada de
 * linhas zebradas — imprime bem em preto e branco, que é como a escola
 * imprime.
 */
export function estiloTabela(fontSize: number): Record<string, unknown> {
  return {
    theme: 'grid',
    margin: MARGEM,
    styles: {
      font: FONTE,
      fontStyle: 'normal',
      fontSize,
      cellPadding: 1.8,
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.1,
      valign: 'top',
      // Explícito: sem isto, um parecer longo numa célula faz o autoTable
      // pedir uma tabela mais larga que a página em vez de quebrar a linha.
      overflow: 'linebreak',
    },
    headStyles: {
      font: FONTE,
      fontStyle: 'bold',
      fillColor: [238, 238, 238],
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.1,
    },
  };
}
