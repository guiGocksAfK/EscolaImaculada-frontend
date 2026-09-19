import type { jsPDF } from 'jspdf';

import { ChamadaMensal } from '../models/chamada.model';
import {
  FONTE,
  Instituicao,
  MARGEM,
  criarCabecalho,
  estiloTabela,
  metadados,
  rodape,
  texto,
} from './estilo-institucional';

// jspdf + jspdf-autotable só entram no bundle quando o usuário gera um PDF.
// A fonte deixou de ser carregada: o estilo usa a Times, que já vem no jsPDF.
type AutoTableFn = (doc: jsPDF, options: Record<string, unknown>) => void;

async function carregarLibs(): Promise<{
  jsPDF: typeof jsPDF;
  autoTable: AutoTableFn;
}> {
  const [jspdf, autotable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return {
    jsPDF: jspdf.jsPDF,
    autoTable: autotable.default as unknown as AutoTableFn,
  };
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

/** Sem registro na grade. Não usar ponto médio: a fonte interna não desenha. */
const SEM_REGISTRO = '-';

const LEGENDA_FREQ =
  'C = compareceu   |   F = falta   |   FJ = falta justificada   |   D = desistente   |   - = sem registro';

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

function finalY(doc: jsPDF, fallback: number): number {
  const lat = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  return lat?.finalY ?? fallback;
}

/** Aviso no lugar de uma tabela que não tem o que mostrar. */
function semDados(doc: jsPDF, y: number, mensagem: string): void {
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(texto(mensagem), MARGEM.left, y + 4);
}

// ---------------------------------------------------------------------------
// Grade mensal de chamada
// ---------------------------------------------------------------------------

/** Tabela de frequência de um mês (aluno × dias), com a legenda embaixo. */
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
    return status ?? SEM_REGISTRO;
  };

  const estilo = estiloTabela(7);
  autoTable(doc, {
    ...estilo,
    startY,
    styles: {
      ...(estilo['styles'] as object),
      cellPadding: 1,
      halign: 'center',
      valign: 'middle',
    },
    head: [['Aluno', ...mes.dias.map((d) => d.slice(8, 10)), 'Faltas']],
    body: mes.linhas.map((l) => [
      texto(l.alunoNome),
      ...mes.dias.map((d) => celula(l, d)),
      String(l.totalFaltas),
    ]),
    columnStyles: { 0: { halign: 'left', cellWidth: 45 } },
    didDrawPage: () => cabecalho(titulo, subtitulo),
  });

  doc.setFont(FONTE, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text(LEGENDA_FREQ, MARGEM.left, finalY(doc, startY) + 6);
}

export async function baixarChamadaMensalPdf(
  dados: ChamadaMensal,
  turmaNome: string,
  justificadas: Set<string> = new Set(),
  escola: Instituicao = { nome: 'Escola' },
): Promise<void> {
  const { jsPDF, autoTable } = await carregarLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  const titulo = 'Registro de frequência mensal';
  const subtitulo = `Turma: ${turmaNome}   |   ${MESES[dados.mes - 1]} de ${dados.ano}`;
  metadados(doc, `${titulo} - ${turmaNome}`, escola);

  const cabecalho = criarCabecalho(doc, escola);
  const y = cabecalho(titulo, subtitulo);

  tabelaFrequencia(doc, autoTable, cabecalho, titulo, subtitulo, dados, justificadas, y);

  rodape(doc);
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

function situacaoAluno(a: { status: string }): string {
  if (a.status === 'TRANSFERIDO') return 'Transferido';
  if (a.status === 'DESISTENTE') return 'Desistente';
  return 'Ativo';
}

/** Payload já montado e filtrado pelo backend (`/relatorios/registro-semestral`). */
export interface RegistroSemestralDados {
  escola: Instituicao;
  turmaNome: string;
  semestre: 1 | 2;
  ano: number;
  /** Um item por mês do semestre — meses sem chamada lançada são ignorados. */
  meses: ChamadaMensal[];
  alunos: Array<{ id: string; nome: string; status: string }>;
  conteudos: Array<{ data: string; conteudo: string }>;
  justificadas: Array<{
    alunoId: string;
    data: string;
    motivo: string;
    aluno?: { nome?: string } | null;
  }>;
  avaliacoes: Array<{
    referencia: string;
    texto: string;
    aluno?: { nome?: string } | null;
  }>;
  responsavelNome: string;
}

/**
 * Registro de classe do semestre: frequência mês a mês, conteúdo dado, faltas
 * justificadas, avaliações e o resumo final — no espírito do diário de classe
 * que a escola preenchia à mão.
 */
export async function baixarRegistroSemestralPdf(
  p: RegistroSemestralDados,
): Promise<void> {
  const { jsPDF, autoTable } = await carregarLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  const periodo = `${p.semestre}º semestre de ${p.ano}`;
  const identificacao = `Turma: ${p.turmaNome}   |   ${periodo}   |   Prof. regente: ${p.responsavelNome || '-'}`;
  metadados(doc, `Registro de classe - ${p.turmaNome} - ${periodo}`, p.escola);

  const cabecalho = criarCabecalho(doc, p.escola);
  const justificadaChave = new Set(
    p.justificadas.map((f) => `${f.alunoId}|${f.data}`),
  );

  // --- Frequência: uma tabela por mês com chamada lançada ---
  const mesesComChamada = p.meses.filter((m) => m.dias.length > 0);
  mesesComChamada.forEach((mes, i) => {
    if (i > 0) doc.addPage();
    const titulo = 'Registro de frequência';
    const sub = `${identificacao}   |   ${MESES[mes.mes - 1]}`;
    const y = cabecalho(titulo, sub);
    tabelaFrequencia(doc, autoTable, cabecalho, titulo, sub, mes, justificadaChave, y);
  });
  if (mesesComChamada.length === 0) {
    const y = cabecalho('Registro de frequência', identificacao);
    semDados(doc, y, 'Nenhuma chamada lançada neste período.');
  }

  // --- Conteúdo dado no período ---
  doc.addPage();
  const tConteudo = 'Registro de conteúdo';
  const yConteudo = cabecalho(tConteudo, identificacao);
  if (p.conteudos.length === 0) {
    semDados(doc, yConteudo, 'Nenhum registro de conteúdo neste período.');
  } else {
    autoTable(doc, {
      ...estiloTabela(8),
      startY: yConteudo,
      head: [['Data', 'Conteúdo trabalhado', 'Responsável']],
      body: p.conteudos.map((c) => [
        formatarData(c.data),
        texto(c.conteudo),
        texto(p.responsavelNome || '-'),
      ]),
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40 },
      },
      didDrawPage: () => cabecalho(tConteudo, identificacao),
    });
  }

  // --- Faltas justificadas do período ---
  doc.addPage();
  const tFaltas = 'Faltas justificadas';
  const yFaltas = cabecalho(tFaltas, identificacao);
  if (p.justificadas.length === 0) {
    semDados(doc, yFaltas, 'Nenhuma falta justificada neste período.');
  } else {
    const alunoNomePorId = new Map(p.alunos.map((a) => [a.id, a.nome]));
    autoTable(doc, {
      ...estiloTabela(8),
      startY: yFaltas,
      head: [['Data', 'Aluno', 'Motivo']],
      body: p.justificadas.map((f) => [
        formatarData(f.data),
        texto(f.aluno?.nome ?? alunoNomePorId.get(f.alunoId) ?? '-'),
        texto(f.motivo),
      ]),
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' } },
      didDrawPage: () => cabecalho(tFaltas, identificacao),
    });
  }

  // --- Avaliações descritivas do período ---
  if (p.avaliacoes.length > 0) {
    doc.addPage();
    const tAval = 'Avaliação descritiva';
    const yAval = cabecalho(tAval, identificacao);
    autoTable(doc, {
      ...estiloTabela(8),
      startY: yAval,
      head: [['Aluno', 'Referência', 'Parecer']],
      body: p.avaliacoes.map((a) => [
        texto(a.aluno?.nome ?? '-'),
        texto(a.referencia),
        texto(a.texto),
      ]),
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 28 }, 2: { cellWidth: 'auto' } },
      didDrawPage: () => cabecalho(tAval, identificacao),
    });
  }

  // --- Resumo final + assinaturas ---
  doc.addPage();
  const tResumo = 'Resumo do período';
  const yResumo = cabecalho(tResumo, identificacao);
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

  doc.setFont(FONTE, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0);
  doc.text(
    `Dias letivos com chamada lançada no período: ${atendimentos}`,
    MARGEM.left,
    yResumo,
  );

  autoTable(doc, {
    ...estiloTabela(8),
    startY: yResumo + 5,
    head: [['Aluno', 'Situação', 'Faltas no período']],
    body: p.alunos.map((a) => [
      texto(a.nome),
      situacaoAluno(a),
      String(faltasPorAluno.get(a.id) ?? 0),
    ]),
    // A coluna do nome absorve a sobra: com todas as larguras fixas, a tabela
    // ficava estreita no meio da página em paisagem (e o autoTable ainda
    // avisava que não sabia o que fazer com o espaço restante).
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40 },
      2: { cellWidth: 40, halign: 'center' },
    },
    didDrawPage: () => cabecalho(tResumo, identificacao),
  });

  assinaturas(doc, finalY(doc, yResumo) + 18);

  rodape(doc);
  doc.save(`registro-semestral-${slug(p.turmaNome)}-${p.ano}-${p.semestre}sem.pdf`);
}

/** Duas linhas de assinatura no fim do registro, como no diário em papel. */
function assinaturas(doc: jsPDF, y: number): void {
  const altura = doc.internal.pageSize.getHeight();
  const largura = doc.internal.pageSize.getWidth();
  // Sem espaço na página atual: assina na próxima, nunca no pé da tabela.
  const yFinal = y > altura - MARGEM.bottom - 14 ? (doc.addPage(), MARGEM.top + 10) : y;

  const linha = 70;
  const esq = MARGEM.left + 15;
  const dir = largura - MARGEM.right - linha - 15;

  doc.setLineWidth(0.3);
  doc.line(esq, yFinal, esq + linha, yFinal);
  doc.line(dir, yFinal, dir + linha, yFinal);

  doc.setFont(FONTE, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(0);
  doc.text('PROFESSORA REGENTE', esq + linha / 2, yFinal + 5, { align: 'center' });
  doc.text('DIRETORA', dir + linha / 2, yFinal + 5, { align: 'center' });
}
