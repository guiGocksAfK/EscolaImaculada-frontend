import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { RelatorioResumo } from '../models/relatorio.model';
import { ChamadaMensal } from '../models/chamada.model';
import { Aluno } from '../models/aluno.model';
import { RegistroConteudo } from '../models/conteudo.model';
import { FaltaJustificada } from '../models/falta-justificada.model';
import { Avaliacao } from '../models/avaliacao.model';
import { ROBOTO_REGULAR_BASE64 } from './roboto-font';

const FONTE = 'Roboto';

/**
 * Registra a Roboto (Unicode) no documento. As fontes padrão do jsPDF são
 * Latin-1 e quebram acentos (ã, º, —) — daí o embed da TTF.
 */
function usarFonteUnicode(doc: jsPDF): void {
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
  doc.addFont('Roboto-Regular.ttf', FONTE, 'normal');
  doc.setFont(FONTE, 'normal');
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

const COMBINANTES = /[̀-ͯ]/g;

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(COMBINANTES, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function cabecalho(doc: jsPDF, titulo: string, subtitulo: string): number {
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(14);
  doc.text('Escola Imaculada', 14, 16);
  doc.setFontSize(11);
  doc.text(titulo, 14, 24);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(subtitulo, 14, 30);
  doc.setTextColor(0);
  return 36;
}

function fimDaTabela(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
}

/** Resumo final por aluno (presenças, faltas, faltas justificadas, avaliação). */
export function baixarResumoPdf(resumo: RelatorioResumo): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  usarFonteUnicode(doc);
  const y = cabecalho(
    doc,
    `Resumo do ano — ${resumo.turmaNome}`,
    `Ano letivo ${resumo.ano} · ${resumo.diasLancados} dia(s) de chamada lançados · emitido em ${new Date().toLocaleDateString('pt-BR')}`,
  );

  autoTable(doc, {
    startY: y,
    head: [['Aluno', 'Pres.', 'Faltas', 'Just.', 'Avaliação descritiva']],
    body: resumo.linhas.map((l) => [
      l.alunoNome,
      String(l.presencas),
      String(l.faltas),
      String(l.faltasJustificadas),
      l.avaliacoes.map((a) => `(${a.referencia}) ${a.texto}`).join('\n\n') ||
        '—',
    ]),
    styles: { font: FONTE, fontStyle: 'normal', fontSize: 8, cellPadding: 2, valign: 'top' },
    headStyles: { font: FONTE, fontStyle: 'normal', fillColor: [21, 101, 192] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
  });

  doc.save(`resumo-${slug(resumo.turmaNome)}-${resumo.ano}.pdf`);
}

/** Grade mensal de chamada (aluno x dias), para impressão em papel. */
export function baixarChamadaMensalPdf(
  dados: ChamadaMensal,
  turmaNome: string,
  justificadas: Set<string> = new Set(),
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  usarFonteUnicode(doc);
  const y = cabecalho(
    doc,
    `Chamada — ${turmaNome}`,
    `${MESES[dados.mes - 1]} de ${dados.ano} · emitido em ${new Date().toLocaleDateString('pt-BR')}`,
  );

  const celula = (
    l: ChamadaMensal['linhas'][number],
    dia: string,
  ): string => {
    const status = l.porDia[dia];
    if (status === 'F' && justificadas.has(`${l.alunoId}|${dia}`)) return 'FJ';
    return status ?? '·';
  };

  autoTable(doc, {
    startY: y,
    head: [['Aluno', ...dados.dias.map((d) => d.slice(8, 10)), 'Faltas']],
    body: dados.linhas.map((l) => [
      l.alunoNome,
      ...dados.dias.map((d) => celula(l, d)),
      String(l.totalFaltas),
    ]),
    styles: { font: FONTE, fontStyle: 'normal', fontSize: 7, cellPadding: 1, halign: 'center' },
    headStyles: { font: FONTE, fontStyle: 'normal', fillColor: [21, 101, 192] },
    columnStyles: { 0: { halign: 'left', cellWidth: 45 } },
  });

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    'C = compareceu · F = falta · FJ = falta justificada · D = desistente · · = sem registro',
    14,
    fimDaTabela(doc) + 6,
  );

  doc.save(
    `chamada-${slug(turmaNome)}-${dados.ano}-${`${dados.mes}`.padStart(2, '0')}.pdf`,
  );
}

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
  avaliacoes: Avaliacao[];
  responsavelNome: string;
}

/**
 * Registro de classe do semestre: frequência (mês a mês), conteúdo dado,
 * faltas justificadas e um resumo final — tudo num único PDF, no espírito
 * dos diários de classe oficiais que a escola já preenchia à mão.
 */
export function baixarRegistroSemestralPdf(p: RegistroSemestralDados): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  usarFonteUnicode(doc);

  const emitido = `emitido em ${new Date().toLocaleDateString('pt-BR')}`;
  const periodo = `${p.semestre}º semestre de ${p.ano}`;

  const justificadaChave = new Set(
    p.justificadas.map((f) => `${f.alunoId}|${f.data}`),
  );

  // --- Frequência: uma tabela por mês com chamada lançada ---
  const mesesComChamada = p.meses.filter((m) => m.dias.length > 0);
  mesesComChamada.forEach((mes, i) => {
    if (i > 0) doc.addPage();
    const y = cabecalho(
      doc,
      `Frequência — ${p.turmaNome}`,
      `${MESES[mes.mes - 1]} de ${mes.ano} · ${periodo} · ${emitido}`,
    );
    autoTable(doc, {
      startY: y,
      head: [['Aluno', ...mes.dias.map((d) => d.slice(8, 10)), 'Faltas']],
      body: mes.linhas.map((l) => [
        l.alunoNome,
        ...mes.dias.map((d) => {
          const status = l.porDia[d];
          if (status === 'F' && justificadaChave.has(`${l.alunoId}|${d}`)) {
            return 'FJ';
          }
          return status ?? '·';
        }),
        String(l.totalFaltas),
      ]),
      styles: { font: FONTE, fontStyle: 'normal', fontSize: 7, cellPadding: 1, halign: 'center' },
      headStyles: { font: FONTE, fontStyle: 'normal', fillColor: [21, 101, 192] },
      columnStyles: { 0: { halign: 'left', cellWidth: 45 } },
    });
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      'C = compareceu · F = falta · FJ = falta justificada · D = desistente · · = sem registro',
      14,
      fimDaTabela(doc) + 6,
    );
    doc.setTextColor(0);
  });

  // --- Conteúdo dado no período ---
  doc.addPage();
  const yConteudo = cabecalho(doc, `Conteúdo — ${p.turmaNome}`, `${periodo} · ${emitido}`);
  if (p.conteudos.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Nenhum registro de conteúdo neste período.', 14, yConteudo + 4);
    doc.setTextColor(0);
  } else {
    autoTable(doc, {
      startY: yConteudo,
      head: [['Data', 'Conteúdo', 'Responsável']],
      body: p.conteudos.map((c) => [
        formatarData(c.data),
        c.conteudo,
        p.responsavelNome || '—',
      ]),
      styles: { font: FONTE, fontStyle: 'normal', fontSize: 8, cellPadding: 2, valign: 'top' },
      headStyles: { font: FONTE, fontStyle: 'normal', fillColor: [21, 101, 192] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40 },
      },
    });
  }

  // --- Faltas justificadas do período ---
  doc.addPage();
  const yFaltas = cabecalho(
    doc,
    `Faltas justificadas — ${p.turmaNome}`,
    `${periodo} · ${emitido}`,
  );
  if (p.justificadas.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text('Nenhuma falta justificada neste período.', 14, yFaltas + 4);
    doc.setTextColor(0);
  } else {
    const alunoNomePorId = new Map(p.alunos.map((a) => [a.id, a.nome]));
    autoTable(doc, {
      startY: yFaltas,
      head: [['Data', 'Aluno', 'Motivo']],
      body: p.justificadas.map((f) => [
        formatarData(f.data),
        f.aluno?.nome ?? alunoNomePorId.get(f.alunoId) ?? '—',
        f.motivo,
      ]),
      styles: { font: FONTE, fontStyle: 'normal', fontSize: 8, cellPadding: 2, valign: 'top' },
      headStyles: { font: FONTE, fontStyle: 'normal', fillColor: [21, 101, 192] },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 45 }, 2: { cellWidth: 'auto' } },
    });
  }

  // --- Avaliações descritivas ---
  if (p.avaliacoes.length > 0) {
    doc.addPage();
    const yAval = cabecalho(doc, `Avaliações — ${p.turmaNome}`, `${periodo} · ${emitido}`);
    autoTable(doc, {
      startY: yAval,
      head: [['Aluno', 'Referência', 'Avaliação descritiva']],
      body: p.avaliacoes.map((a) => [
        a.aluno?.nome ?? '—',
        a.referencia,
        a.texto,
      ]),
      styles: { font: FONTE, fontStyle: 'normal', fontSize: 8, cellPadding: 2, valign: 'top' },
      headStyles: { font: FONTE, fontStyle: 'normal', fillColor: [21, 101, 192] },
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 28 }, 2: { cellWidth: 'auto' } },
    });
  }

  // --- Resumo final ---
  doc.addPage();
  const yResumo = cabecalho(doc, `Resumo — ${p.turmaNome}`, `${periodo} · ${emitido}`);
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
  doc.text(`Atendimentos (dias letivos lançados no período): ${atendimentos}`, 14, yResumo);
  autoTable(doc, {
    startY: yResumo + 5,
    head: [['Aluno', 'Situação', 'Faltas no período']],
    body: p.alunos.map((a) => [
      a.nome,
      situacaoAluno(a),
      String(faltasPorAluno.get(a.id) ?? 0),
    ]),
    styles: { font: FONTE, fontStyle: 'normal', fontSize: 8, cellPadding: 2 },
    headStyles: { font: FONTE, fontStyle: 'normal', fillColor: [21, 101, 192] },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30, halign: 'center' } },
  });

  doc.save(
    `registro-semestral-${slug(p.turmaNome)}-${p.ano}-${p.semestre}sem.pdf`,
  );
}
