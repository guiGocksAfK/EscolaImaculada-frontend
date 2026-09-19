import { jsPDF } from 'jspdf';

import { texto } from './estilo-institucional';

/**
 * Parecer descritivo da avaliação da aprendizagem — uma criança por página.
 *
 * Reproduz o formulário em papel que a escola já usa. Três regras vieram
 * direto do retorno da diretora e mandam no layout:
 *
 * 1. Uma criança por folha. Nunca começa o parecer de outra no meio da página.
 * 2. A caixa da avaliação é elástica: ocupa o espaço que sobra entre a
 *    identificação e o quadro do semestre.
 * 3. O quadro de assinaturas fica SEMPRE na mesma página em que o texto
 *    termina. Era a queixa principal: assinatura caindo no verso da folha.
 *
 * Tipografia com serifa (Times) e preto e branco de propósito — é documento
 * que vai para a pasta da criança e para a secretaria, não tela de sistema.
 */

const FONTE = 'times';

const PAGINA = { largura: 210, altura: 297 }; // A4 retrato, em mm
const MARGEM = { esq: 18, dir: 18, topo: 14, base: 14 };
const UTIL = PAGINA.largura - MARGEM.esq - MARGEM.dir;

/** Recuo do texto dentro da caixa da avaliação. */
const RESPIRO_CAIXA = 4;

/** Corpo do texto da avaliação: tenta o maior e vai diminuindo até caber. */
const CORPOS_AVALIACAO = [11, 10.5, 10, 9.5, 9];

const ALTURA_LINHA_IDENT = 6.2;
const ALTURA_LINHA_QUADRO = 9.5;
const ALTURA_CABECALHO_QUADRO = 8;

export interface ParecerAluno {
  nome: string;
  dataNascimento: string; // ISO (YYYY-MM-DD)
  /** Vem de `localNascimento`, que o cadastro guarda como "Cidade - UF". */
  municipio: string;
  estado: string;
  nomePai: string;
  nomeMae: string;
  turmaNome: string;
  /** Avaliação descritiva do semestre. Vazio imprime a caixa em branco. */
  texto: string;
  faltas: number;
}

export interface ParecerParams {
  escolaNome: string;
  escolaEndereco?: string;
  /** Ainda não existe no cadastro da escola; some do cabeçalho se vier vazio. */
  escolaTelefone?: string;
  ano: number;
  semestre: 1 | 2;
  professoraNome: string;
  diasLetivos: number;
  alunos: ParecerAluno[];
}

// ---------------------------------------------------------------------------
// Montagem a partir das duas fontes da API
// ---------------------------------------------------------------------------

/** Só o que o parecer usa do registro semestral (evita amarrar ao modelo da API). */
export interface DadosDoSemestre {
  turmaNome: string;
  responsavelNome: string;
  atendimentos: number;
  alunos: Array<{ id: string; nome: string; dataNascimento: string }>;
  avaliacoes: Array<{ alunoId: string; referencia: string; texto: string }>;
  faltasPorAluno: Record<string, number>;
}

/** Do cadastro do aluno vem o que o registro semestral não traz. */
export interface FichaDoAluno {
  id: string;
  nomePai?: string;
  nomeMae?: string;
  localNascimento?: string;
}

/**
 * Junta as duas fontes porque nenhuma tem tudo: o registro semestral traz
 * faltas e avaliações do período; o cadastro traz filiação e local de
 * nascimento, que a identificação do formulário exige.
 */
export function montarAlunosDoParecer(
  semestre: 1 | 2,
  dados: DadosDoSemestre,
  fichas: FichaDoAluno[],
  turmaNome?: string,
): ParecerAluno[] {
  const porId = new Map(fichas.map((f) => [f.id, f]));

  return dados.alunos
    .map((aluno) => {
      const ficha = porId.get(aluno.id);
      const [municipio, estado] = partirLocal(ficha?.localNascimento);
      return {
        nome: aluno.nome,
        dataNascimento: aluno.dataNascimento,
        municipio,
        estado,
        nomePai: ficha?.nomePai ?? '',
        nomeMae: ficha?.nomeMae ?? '',
        turmaNome: turmaNome ?? dados.turmaNome,
        texto: dados.avaliacoes
          .filter((a) => a.alunoId === aluno.id && doSemestre(a.referencia, semestre))
          .map((a) => a.texto.trim())
          .join('\n\n'),
        faltas: dados.faltasPorAluno[aluno.id] ?? 0,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Separa "Cascavel - PR", "Curitiba/PR" ou "Toledo, PR" em município e UF.
 *
 * O cadastro guarda tudo num campo de texto livre, e na prática cada um
 * escreve de um jeito. Só considera UF quando o final são mesmo duas letras;
 * caso contrário o valor inteiro é o município e a UF fica em branco, para a
 * pessoa completar à mão — melhor isso do que cortar o nome da cidade.
 */
export function partirLocal(local?: string): [string, string] {
  const bruto = (local ?? '').trim();
  if (!bruto) return ['', ''];

  const separado = bruto.match(/^(.*?)\s*[-/,]\s*([A-Za-zÀ-ú]{2})\.?$/);
  if (separado) return [separado[1].trim(), separado[2].toUpperCase()];
  return [bruto, ''];
}

/**
 * A avaliação é de qual semestre? A referência é texto livre digitado pela
 * professora ("1º semestre 2026" é o padrão que o formulário sugere), então
 * procura o dígito colado no "semestre" e aceita também "primeiro"/"segundo".
 * Sem nenhuma pista, fica de fora — melhor a caixa vazia do que o texto errado.
 */
export function doSemestre(referencia: string, semestre: 1 | 2): boolean {
  const limpo = (referencia ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  const comDigito = limpo.match(/(\d)\s*[ºo°.)]*\s*sem/);
  if (comDigito) return Number(comDigito[1]) === semestre;
  if (limpo.includes('primeiro')) return semestre === 1;
  if (limpo.includes('segundo')) return semestre === 2;
  return false;
}

/** Nome do arquivo salvo — também usado pela tela ao baixar. */
export function nomeArquivoParecer(p: ParecerParams): string {
  const turma = p.alunos[0]?.turmaNome ?? 'turma';
  return `parecer-${slug(turma)}-${p.semestre}sem-${p.ano}.pdf`;
}

export function baixarParecerPdf(p: ParecerParams): void {
  montarParecerPdf(p).save(nomeArquivoParecer(p));
}

/** Monta o documento sem salvar — separado para dar para conferir fora do navegador. */
export function montarParecerPdf(p: ParecerParams): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setProperties({
    title: `Parecer descritivo — ${p.ano} — ${p.semestre}º semestre`,
    subject: p.escolaNome,
    creator: p.escolaNome,
  });

  p.alunos.forEach((aluno, i) => {
    if (i > 0) doc.addPage();
    desenharParecer(doc, p, aluno);
  });

  return doc;
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

function desenharParecer(doc: jsPDF, p: ParecerParams, aluno: ParecerAluno): void {
  const yDepoisIdent = desenharTopo(doc, p, aluno);

  const alturaQuadro = ALTURA_CABECALHO_QUADRO * 2 + ALTURA_LINHA_QUADRO * 7;
  const alturaAssinaturas = 24;
  const baseDaCaixaNaUltima =
    PAGINA.altura - MARGEM.base - alturaAssinaturas - alturaQuadro - 6;
  const baseDaCaixaCheia = PAGINA.altura - MARGEM.base;

  const linhasPorPagina = repartirTexto(
    doc,
    aluno.texto,
    yDepoisIdent,
    baseDaCaixaNaUltima,
    baseDaCaixaCheia,
  );

  linhasPorPagina.forEach((pagina, indice) => {
    if (indice > 0) {
      doc.addPage();
      desenharTopoContinuacao(doc, p, aluno);
    }
    const ultima = indice === linhasPorPagina.length - 1;
    const topoCaixa = indice === 0 ? yDepoisIdent : MARGEM.topo + 18;
    const baseCaixa = ultima ? baseDaCaixaNaUltima : baseDaCaixaCheia;

    desenharCaixa(doc, topoCaixa, baseCaixa, pagina.linhas, pagina.corpo);

    if (ultima) {
      const yQuadro = baseCaixa + 6;
      desenharQuadroSemestre(doc, p, aluno, yQuadro, alturaQuadro);
      desenharAssinaturas(doc, yQuadro + alturaQuadro + 14);
    }
  });
}

/** Cabeçalho institucional + título + bloco de identificação. Devolve o y final. */
function desenharTopo(doc: jsPDF, p: ParecerParams, aluno: ParecerAluno): number {
  let y = MARGEM.topo + 4;
  const centro = PAGINA.largura / 2;

  doc.setFont(FONTE, 'bold');
  doc.setFontSize(12);
  doc.text(texto(p.escolaNome.toUpperCase()), centro, y, { align: 'center' });

  doc.setFont(FONTE, 'normal');
  doc.setFontSize(10);
  if (p.escolaEndereco) {
    y += 5;
    doc.text(texto(p.escolaEndereco), centro, y, { align: 'center' });
  }
  if (p.escolaTelefone) {
    y += 4.5;
    doc.text(`Tel.: ${p.escolaTelefone}`, centro, y, { align: 'center' });
  }

  y += 9;
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(12);
  doc.text('PARECER DESCRITIVO DA AVALIAÇÃO DA APRENDIZAGEM', centro, y, {
    align: 'center',
  });
  y += 5.5;
  doc.text(`${p.semestre === 1 ? 'PRIMEIRO' : 'SEGUNDO'} SEMESTRE - ${p.ano}`, centro, y, {
    align: 'center',
  });

  y += 8;
  doc.setFontSize(10.5);
  doc.text('DADOS DE IDENTIFICAÇÃO:', MARGEM.esq, y);

  doc.setFont(FONTE, 'normal');
  doc.setFontSize(10);

  y += ALTURA_LINHA_IDENT;
  let x = MARGEM.esq;
  x = campo(doc, x, y, 'Nome do(a) aluno(a):', texto(aluno.nome.toUpperCase()), UTIL - 62);
  campo(doc, x, y, 'Sexo:', '', 0);
  doc.text('Masc.(    ) Fem.(    )', x + doc.getTextWidth('Sexo: '), y);

  y += ALTURA_LINHA_IDENT;
  x = MARGEM.esq;
  x = campo(doc, x, y, 'Data de nascimento:', formatarData(aluno.dataNascimento), 34);
  x = campo(doc, x + 6, y, 'Município:', texto(aluno.municipio), 40);
  campo(doc, x + 4, y, 'Estado:', aluno.estado, 18);

  y += ALTURA_LINHA_IDENT;
  x = MARGEM.esq;
  x = campo(doc, x, y, 'Filiação: Pai:', texto(aluno.nomePai), 52);
  x = campo(doc, x + 3, y, 'Mãe:', texto(aluno.nomeMae), 58);
  campo(doc, x + 3, y, 'Turma:', aluno.turmaNome, MARGEM.esq + UTIL - x - 3 - doc.getTextWidth('Turma: '));

  y += ALTURA_LINHA_IDENT;
  campo(doc, MARGEM.esq, y, 'Prof. Regente:', texto(p.professoraNome), UTIL - doc.getTextWidth('Prof. Regente: '));

  y += ALTURA_LINHA_IDENT;
  doc.setFont(FONTE, 'bold');
  doc.text('Data transferência:', MARGEM.esq, y);
  const xTransf = MARGEM.esq + doc.getTextWidth('Data transferência: ');
  doc.setFont(FONTE, 'normal');
  doc.text('____/____/________', xTransf, y);
  const xObs = xTransf + doc.getTextWidth('____/____/________ ');
  doc.text('(quando transferido)  CEI:', xObs, y);
  const xCei = xObs + doc.getTextWidth('(quando transferido)  CEI: ');
  doc.line(xCei, y + 1, MARGEM.esq + UTIL, y + 1);

  return y + 7;
}

/** Páginas seguintes do mesmo parecer: só o suficiente para não ficar órfão. */
function desenharTopoContinuacao(doc: jsPDF, p: ParecerParams, aluno: ParecerAluno): void {
  const centro = PAGINA.largura / 2;
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(11);
  doc.text(p.escolaNome.toUpperCase(), centro, MARGEM.topo + 4, { align: 'center' });
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(10);
  doc.text(
    texto(`${aluno.nome.toUpperCase()} - ${p.semestre}º semestre ${p.ano} (continuação)`),
    centro,
    MARGEM.topo + 10,
    { align: 'center' },
  );
}

/**
 * Rótulo em negrito + valor sobre uma linha, como no formulário em papel.
 * Devolve o x onde o próximo campo pode começar.
 */
function campo(
  doc: jsPDF,
  x: number,
  y: number,
  rotulo: string,
  valor: string,
  largura: number,
): number {
  doc.setFont(FONTE, 'bold');
  doc.text(rotulo, x, y);
  const xValor = x + doc.getTextWidth(`${rotulo} `);
  if (largura <= 0) return xValor;

  doc.setFont(FONTE, 'normal');
  const texto = encolherAte(doc, valor, largura - 2);
  doc.text(texto, xValor + 1, y);
  doc.setLineWidth(0.2);
  doc.line(xValor, y + 1, xValor + largura, y + 1);
  return xValor + largura;
}

/** Corta com reticências para o valor nunca invadir o campo seguinte. */
function encolherAte(doc: jsPDF, texto: string, largura: number): string {
  if (!texto || doc.getTextWidth(texto) <= largura) return texto ?? '';
  let corte = texto;
  while (corte.length > 1 && doc.getTextWidth(`${corte}...`) > largura) {
    corte = corte.slice(0, -1);
  }
  return `${corte}...`;
}

// ---------------------------------------------------------------------------
// Caixa da avaliação
// ---------------------------------------------------------------------------

interface PaginaDeTexto {
  linhas: string[];
  corpo: number;
}

/**
 * Distribui o texto entre as páginas necessárias.
 *
 * Primeiro tenta caber tudo em uma página só, diminuindo o corpo da fonte
 * dentro de um limite legível. Só se ainda não couber é que quebra em mais
 * páginas — e a última sempre reserva o espaço do quadro de assinaturas.
 */
function repartirTexto(
  doc: jsPDF,
  bruto: string,
  topoPrimeira: number,
  baseUltima: number,
  baseCheia: number,
): PaginaDeTexto[] {
  const conteudo = texto(bruto ?? '').trim();
  if (!conteudo) return [{ linhas: [], corpo: CORPOS_AVALIACAO[0] }];

  const larguraTexto = UTIL - RESPIRO_CAIXA * 2;

  for (const corpo of CORPOS_AVALIACAO) {
    doc.setFont(FONTE, 'normal');
    doc.setFontSize(corpo);
    const linhas = doc.splitTextToSize(conteudo, larguraTexto) as string[];
    if (linhas.length <= cabem(corpo, topoPrimeira, baseUltima)) {
      return [{ linhas, corpo }];
    }
  }

  // Não coube nem no menor corpo: reparte mantendo o menor tamanho.
  const corpo = CORPOS_AVALIACAO[CORPOS_AVALIACAO.length - 1];
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(corpo);
  const restantes = doc.splitTextToSize(conteudo, larguraTexto) as string[];

  const paginas: PaginaDeTexto[] = [];
  let topo = topoPrimeira;
  let sobra = [...restantes];
  while (sobra.length) {
    const naUltima = sobra.length <= cabem(corpo, topo, baseUltima);
    const limite = cabem(corpo, topo, naUltima ? baseUltima : baseCheia);
    paginas.push({ linhas: sobra.slice(0, limite), corpo });
    sobra = sobra.slice(limite);
    topo = MARGEM.topo + 18;
  }
  return paginas;
}

function alturaLinha(corpo: number): number {
  return corpo * 0.3528 * 1.32; // pt -> mm, com entrelinha
}

function cabem(corpo: number, topo: number, base: number): number {
  return Math.max(1, Math.floor((base - topo - RESPIRO_CAIXA * 2) / alturaLinha(corpo)));
}

function desenharCaixa(
  doc: jsPDF,
  topo: number,
  base: number,
  linhas: string[],
  corpo: number,
): void {
  doc.setLineWidth(0.4);
  doc.rect(MARGEM.esq, topo, UTIL, base - topo);

  if (!linhas.length) return;
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(corpo);
  let y = topo + RESPIRO_CAIXA + alturaLinha(corpo) * 0.8;
  for (const linha of linhas) {
    doc.text(linha, MARGEM.esq + RESPIRO_CAIXA, y);
    y += alturaLinha(corpo);
  }
}

// ---------------------------------------------------------------------------
// Quadro do semestre e assinaturas
// ---------------------------------------------------------------------------

function desenharQuadroSemestre(
  doc: jsPDF,
  p: ParecerParams,
  aluno: ParecerAluno,
  topo: number,
  altura: number,
): void {
  const xDivisoria = MARGEM.esq + UTIL * 0.55;
  const direita = MARGEM.esq + UTIL;

  doc.setLineWidth(0.3);
  doc.rect(MARGEM.esq, topo, UTIL, altura);

  // Duas faixas de cabeçalho, só na coluna da direita (como no formulário).
  let y = topo;
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(10.5);
  doc.text(`${p.semestre}º SEMESTRE`, (xDivisoria + direita) / 2, y + 5.6, {
    align: 'center',
  });
  y += ALTURA_CABECALHO_QUADRO;
  doc.line(xDivisoria, y, direita, y);
  doc.text('FINAL', (xDivisoria + direita) / 2, y + 5.6, { align: 'center' });
  y += ALTURA_CABECALHO_QUADRO;
  doc.line(MARGEM.esq, y, direita, y);

  const linhas: Array<[string, string]> = [
    ['Números de dias letivos', String(p.diasLetivos)],
    ['Número de faltas', String(aluno.faltas)],
    ['Assinatura do(a) responsável Legal', ''],
    ['Assinatura do(a) professor(a) regente', ''],
    ['Coordenador(a) pedagógico(a)', ''],
    ['Diretor(a)', ''],
    ['Data', '____/____/________'],
  ];

  doc.setFontSize(10);
  for (const [rotulo, valor] of linhas) {
    doc.text(rotulo, MARGEM.esq + 2.5, y + 6.2);
    if (valor) {
      doc.text(valor, (xDivisoria + direita) / 2, y + 6.2, { align: 'center' });
    }
    y += ALTURA_LINHA_QUADRO;
    if (y < topo + altura - 0.1) doc.line(MARGEM.esq, y, direita, y);
  }

  // Divisória vertical só onde existem as duas colunas.
  doc.line(xDivisoria, topo, xDivisoria, topo + altura);
}

function desenharAssinaturas(doc: jsPDF, y: number): void {
  const largura = 62;
  const esquerda = MARGEM.esq + 6;
  const direita = MARGEM.esq + UTIL - largura - 6;

  doc.setLineWidth(0.3);
  doc.line(esquerda, y, esquerda + largura, y);
  doc.line(direita, y, direita + largura, y);

  doc.setFont(FONTE, 'normal');
  doc.setFontSize(10);
  doc.text('DIRETORA', esquerda + largura / 2, y + 5, { align: 'center' });
  doc.text('PROFESSORA', direita + largura / 2, y + 5, { align: 'center' });
}

// ---------------------------------------------------------------------------

function formatarData(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
