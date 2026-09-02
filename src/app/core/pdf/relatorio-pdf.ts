import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { RelatorioResumo } from '../models/relatorio.model';
import { ChamadaMensal } from '../models/chamada.model';

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
    styles: { fontSize: 8, cellPadding: 2, valign: 'top' },
    headStyles: { fillColor: [21, 101, 192] },
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
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const y = cabecalho(
    doc,
    `Chamada — ${turmaNome}`,
    `${MESES[dados.mes - 1]} de ${dados.ano} · emitido em ${new Date().toLocaleDateString('pt-BR')}`,
  );

  autoTable(doc, {
    startY: y,
    head: [['Aluno', ...dados.dias.map((d) => d.slice(8, 10)), 'Faltas']],
    body: dados.linhas.map((l) => [
      l.alunoNome,
      ...dados.dias.map((d) => l.porDia[d] ?? '·'),
      String(l.totalFaltas),
    ]),
    styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
    headStyles: { fillColor: [21, 101, 192] },
    columnStyles: { 0: { halign: 'left', cellWidth: 45 } },
  });

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    'C = compareceu · F = falta · D = desistente · · = sem registro',
    14,
    fimDaTabela(doc) + 6,
  );

  doc.save(
    `chamada-${slug(turmaNome)}-${dados.ano}-${`${dados.mes}`.padStart(2, '0')}.pdf`,
  );
}
