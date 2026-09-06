import type { jsPDF } from 'jspdf';

import { RelatorioResumo } from '../models/relatorio.model';
import { ChamadaMensal } from '../models/chamada.model';
import { Aluno } from '../models/aluno.model';
import { RegistroConteudo } from '../models/conteudo.model';
import { FaltaJustificada } from '../models/falta-justificada.model';
import { Avaliacao } from '../models/avaliacao.model';

const FONTE = 'Roboto';
const AZUL: [number, number, number] = [21, 101, 192];
const MARGEM = { top: 34, left: 14, right: 14, bottom: 16 } as const;

// jspdf + jspdf-autotable + a fonte (224 KB) só entram no bundle quando o
// usuário realmente gera um PDF.
type AutoTableFn = (doc: jsPDF, options: Record<string, unknown>) => void;

async function carregarLibs(): Promise<{
  jsPDF: typeof jsPDF;
  autoTable: AutoTableFn;
  fonteBase64: string;
}> {
  const [jspdf, autotable, fonte] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('./roboto-font'),
  ]);
  return {
    jsPDF: jspdf.jsPDF,
    autoTable: autotable.default as unknown as AutoTableFn,
    fonteBase64: fonte.ROBOTO_REGULAR_BASE64,
  };
}

/**
 * Registra a Roboto (Unicode) no documento. As fontes padrão do jsPDF são
 * Latin-1 e quebram acentos (ã, º, —) — daí o embed da TTF.
 */
function usarFonteUnicode(doc: jsPDF, fonteBase64: string): void {
  doc.addFileToVFS('Roboto-Regular.ttf', fonteBase64);
  doc.addFont('Roboto-Regular.ttf', FONTE, 'normal');
  doc.setFont(FONTE, 'normal');
}

function metadados(doc: jsPDF, titulo: string): void {
  doc.setProperties({
    title: titulo,
    subject: titulo,
    author: 'Escola Imaculada',
    creator: 'Sistema de Registro de Classe',
  });
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const LEGENDA_FREQ =
  'C = compareceu · F = falta · FJ = falta justificada · D = desistente · · = sem registro';

const COMBINANTES = /[̀-ͯ]/g;

function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(COMBINANTES, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'documento'
  );
}

function agora(): string {
  return new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Desenha o cabeçalho da página atual — no máximo uma vez por página, para
 * poder ser chamado tanto manualmente quanto pelo hook `didDrawPage` do
 * autoTable (que repete em páginas de continuação).
 */
function criarCabecalho(doc: jsPDF) {
  let ultimaPagina = -1;
  return (titulo: string, subtitulo: string): number => {
    const pagina = doc.getNumberOfPages();
    if (pagina !== ultimaPagina) {
      ultimaPagina = pagina;
      doc.setFont(FONTE, 'normal');
      doc.setTextColor(0);
      doc.setFontSize(14);
      doc.text('Escola Imaculada', MARGEM.left, 16);
      doc.setFontSize(11);
      doc.text(titulo, MARGEM.left, 24);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(subtitulo, MARGEM.left, 30);
      doc.setTextColor(0);
    }
    return MARGEM.top + 2;
  };
}

/** Carimba "Página X de N" no rodapé de todas as páginas. Chamar por último. */
function numerarPaginas(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont(FONTE, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Página ${i} de ${total}`, w - MARGEM.right, h - 8, {
      align: 'right',
    });
    doc.setTextColor(0);
  }
}

function finalY(doc: jsPDF, fallback: number): number {
  const lat = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  return lat?.finalY ?? fallback;
}

/** Opções comuns a todas as tabelas (estilo + cabeçalho repetido por página). */
function baseTabela(
  doc: jsPDF,
  cabecalho: (t: string, s: string) => number,
  titulo: string,
  subtitulo: string,
  fontSize: number,
): Record<string, unknown> {
  return {
    margin: MARGEM,
    styles: { font: FONTE, fontStyle: 'normal', fontSize, cellPadding: 2, valign: 'top' },
    headStyles: { font: FONTE, fontStyle: 'normal', fillColor: AZUL },
    didDrawPage: () => cabecalho(titulo, subtitulo),
  };
}

// ---------------------------------------------------------------------------
// Resumo anual por aluno
// ---------------------------------------------------------------------------

export async function baixarResumoPdf(resumo: RelatorioResumo): Promise<void> {
  const { jsPDF, autoTable, fonteBase64 } = await carregarLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  usarFonteUnicode(doc, fonteBase64);

  const titulo = `Resumo do ano — ${resumo.turmaNome}`;
  const subtitulo = `Ano letivo ${resumo.ano} · ${resumo.diasLancados} dia(s) de chamada lançados · emitido em ${agora()}`;
  metadados(doc, titulo);
  const cabecalho = criarCabecalho(doc);
  const y = cabecalho(titulo, subtitulo);

  autoTable(doc, {
    ...baseTabela(doc, cabecalho, titulo, subtitulo, 8),
    startY: y,
    head: [['Aluno', 'Pres.', 'Faltas', 'Just.', 'Avaliação descritiva']],
    body: resumo.linhas.map((l) => [
      l.alunoNome,
      String(l.presencas),
      String(l.faltas),
      String(l.faltasJustificadas),
      l.avaliacoes.map((a) => `(${a.referencia}) ${a.texto}`).join('\n\n') || '—',
    ]),
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
  });

  numerarPaginas(doc);
  doc.save(`resumo-${slug(resumo.turmaNome)}-${resumo.ano}.pdf`);
}

// ---------------------------------------------------------------------------
// Grade mensal de chamada
// ---------------------------------------------------------------------------

/** Desenha uma tabela de frequência de um mês (aluno × dias). */
function tabelaFrequencia(
  doc: jsPDF,
  autoTable: AutoTableFn,
  cabecalho: (t: string, s: string) => number,
  titulo: string,
  subtitulo: string,
  mes: ChamadaMensal,
  justificadas: Set<string>,
  startY: number,
): void {
  const celula = (l: ChamadaMensal['linhas'][number], dia: string): string => {
    const status = l.porDia[dia];
    if (status === 'F' && justificadas.has(`${l.alunoId}|${dia}`)) return 'FJ';
    return status ?? '·';
  };

  autoTable(doc, {
    ...baseTabela(doc, cabecalho, titulo, subtitulo, 7),
    startY,
    styles: { font: FONTE, fontStyle: 'normal', fontSize: 7, cellPadding: 1, halign: 'center' },
    headStyles: { font: FONTE, fontStyle: 'normal', fillColor: AZUL },
    head: [['Aluno', ...mes.dias.map((d) => d.slice(8, 10)), 'Faltas']],
    body: mes.linhas.map((l) => [
      l.alunoNome,
      ...mes.dias.map((d) => celula(l, d)),
      String(l.totalFaltas),
    ]),
    columnStyles: { 0: { halign: 'left', cellWidth: 45 } },
  });

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(LEGENDA_FREQ, MARGEM.left, finalY(doc, startY) + 6);
  doc.setTextColor(0);
}

export async function baixarChamadaMensalPdf(
  dados: ChamadaMensal,
  turmaNome: string,
  justificadas: Set<string> = new Set(),
): Promise<void> {
  const { jsPDF, autoTable, fonteBase64 } = await carregarLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  usarFonteUnicode(doc, fonteBase64);

  const titulo = `Chamada — ${turmaNome}`;
  const subtitulo = `${MESES[dados.mes - 1]} de ${dados.ano} · emitido em ${agora()}`;
  metadados(doc, titulo);
  const cabecalho = criarCabecalho(doc);
  const y = cabecalho(titulo, subtitulo);

  tabelaFrequencia(
    doc,
    autoTable,
    cabecalho,
    titulo,
    subtitulo,
    dados,
    justificadas,
    y,
  );

  numerarPaginas(doc);
  doc.save(
    `chamada-${slug(turmaNome)}-${dados.ano}-${`${dados.mes}`.padStart(2, '0')}.pdf`,
  );
}

// ---------------------------------------------------------------------------
// Registro de classe semestral
// ---------------------------------------------------------------------------

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function situacaoAluno(a: Aluno): string {
  if (a.status === 'TRANSFERIDO') return 'Transferido';
  if (a.status === 'DESISTENTE') return 'Desistente';
  return '';
}

export interface RegistroSemestralDados {
  turmaNome: string;
  semestre: 1 | 2;
  ano: number;
  /** Um item por mês do semestre — meses sem chamada lançada (dias vazio) são ignorados na grade. */
  meses: ChamadaMensal[];
  alunos: Aluno[];
  /** Registros de conteúdo já filtrados para o período, ordenados por data. */
  conteudos: RegistroConteudo[];
  /** Faltas justificadas já filtradas para o período, ordenados por data. */
  justificadas: FaltaJustificada[];
  /** Avaliações já filtradas para o período. */
  avaliacoes: Avaliacao[];
  responsavelNome: string;
}

/**
 * Registro de classe do semestre: frequência (mês a mês), conteúdo dado,
 * faltas justificadas e um resumo final — tudo num único PDF, no espírito
 * dos diários de classe oficiais que a escola já preenchia à mão.
 */
export async function baixarRegistroSemestralPdf(
  p: RegistroSemestralDados,
): Promise<void> {
  const { jsPDF, autoTable, fonteBase64 } = await carregarLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  usarFonteUnicode(doc, fonteBase64);

  const periodo = `${p.semestre}º semestre de ${p.ano}`;
  const emitido = `emitido em ${agora()}`;
  const tituloDoc = `Registro de classe — ${p.turmaNome} — ${periodo}`;
  metadados(doc, tituloDoc);

  const cabecalho = criarCabecalho(doc);
  const justificadaChave = new Set(
    p.justificadas.map((f) => `${f.alunoId}|${f.data}`),
  );

  const semTabela = (titulo: string, sub: string, msg: string): void => {
    const y = cabecalho(titulo, sub);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(msg, MARGEM.left, y + 4);
    doc.setTextColor(0);
  };

  // --- Frequência: uma tabela por mês com chamada lançada ---
  const mesesComChamada = p.meses.filter((m) => m.dias.length > 0);
  mesesComChamada.forEach((mes, i) => {
    if (i > 0) doc.addPage();
    const titulo = `Frequência — ${p.turmaNome}`;
    const sub = `${MESES[mes.mes - 1]} de ${mes.ano} · ${periodo} · ${emitido}`;
    const y = cabecalho(titulo, sub);
    tabelaFrequencia(doc, autoTable, cabecalho, titulo, sub, mes, justificadaChave, y);
  });
  if (mesesComChamada.length === 0) {
    semTabela(
      `Frequência — ${p.turmaNome}`,
      `${periodo} · ${emitido}`,
      'Nenhuma chamada lançada neste período.',
    );
  }

  // --- Conteúdo dado no período ---
  doc.addPage();
  const tConteudo = `Conteúdo — ${p.turmaNome}`;
  const sConteudo = `${periodo} · ${emitido}`;
  if (p.conteudos.length === 0) {
    semTabela(tConteudo, sConteudo, 'Nenhum registro de conteúdo neste período.');
  } else {
    const y = cabecalho(tConteudo, sConteudo);
    autoTable(doc, {
      ...baseTabela(doc, cabecalho, tConteudo, sConteudo, 8),
      startY: y,
      head: [['Data', 'Conteúdo', 'Responsável']],
      body: p.conteudos.map((c) => [
        formatarData(c.data),
        c.conteudo,
        p.responsavelNome || '—',
      ]),
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40 },
      },
    });
  }

  // --- Faltas justificadas do período ---
  doc.addPage();
  const tFaltas = `Faltas justificadas — ${p.turmaNome}`;
  const sFaltas = `${periodo} · ${emitido}`;
  if (p.justificadas.length === 0) {
    semTabela(tFaltas, sFaltas, 'Nenhuma falta justificada neste período.');
  } else {
    const alunoNomePorId = new Map(p.alunos.map((a) => [a.id, a.nome]));
    const y = cabecalho(tFaltas, sFaltas);
    autoTable(doc, {
      ...baseTabela(doc, cabecalho, tFaltas, sFaltas, 8),
      startY: y,
      head: [['Data', 'Aluno', 'Motivo']],
      body: p.justificadas.map((f) => [
        formatarData(f.data),
        f.aluno?.nome ?? alunoNomePorId.get(f.alunoId) ?? '—',
        f.motivo,
      ]),
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' } },
    });
  }

  // --- Avaliações descritivas do período ---
  if (p.avaliacoes.length > 0) {
    doc.addPage();
    const t = `Avaliações — ${p.turmaNome}`;
    const s = `${periodo} · ${emitido}`;
    const y = cabecalho(t, s);
    autoTable(doc, {
      ...baseTabela(doc, cabecalho, t, s, 8),
      startY: y,
      head: [['Aluno', 'Referência', 'Avaliação descritiva']],
      body: p.avaliacoes.map((a) => [a.aluno?.nome ?? '—', a.referencia, a.texto]),
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 28 }, 2: { cellWidth: 'auto' } },
    });
  }

  // --- Resumo final ---
  doc.addPage();
  const tResumo = `Resumo — ${p.turmaNome}`;
  const sResumo = `${periodo} · ${emitido}`;
  const yResumo = cabecalho(tResumo, sResumo);
  const atendimentos = mesesComChamada.reduce((soma, m) => soma + m.dias.length, 0);
  const faltasPorAluno = new Map<string, number>();
  for (const mes of mesesComChamada) {
    for (const linha of mes.linhas) {
      faltasPorAluno.set(
        linha.alunoId,
        (faltasPorAluno.get(linha.alunoId) ?? 0) + linha.totalFaltas,
      );
    }
  }
  doc.setFontSize(9);
  doc.text(
    `Atendimentos (dias letivos lançados no período): ${atendimentos}`,
    MARGEM.left,
    yResumo,
  );
  autoTable(doc, {
    ...baseTabela(doc, cabecalho, tResumo, sResumo, 8),
    startY: yResumo + 5,
    head: [['Aluno', 'Situação', 'Faltas no período']],
    body: p.alunos.map((a) => [
      a.nome,
      situacaoAluno(a),
      String(faltasPorAluno.get(a.id) ?? 0),
    ]),
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30, halign: 'center' } },
  });

  numerarPaginas(doc);
  doc.save(`registro-semestral-${slug(p.turmaNome)}-${p.ano}-${p.semestre}sem.pdf`);
}
