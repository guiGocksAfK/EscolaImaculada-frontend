export const environment = {
  production: true,
  // Front (Vercel) e back (VM da Oracle) ficam em domínios diferentes, então
  // isso precisa ser a URL completa da API — não dá pra usar caminho relativo
  // como em dev. Este mesmo domínio está liberado no connect-src do CSP, no
  // index.html: mudar aqui exige mudar lá também.
  apiUrl: 'https://escolaimaculada.duckdns.org',
  // Fallback do nome na tela de login (a tela busca GET /escola/publica
  // primeiro; este valor só aparece se o backend não responder).
  nomeEscolaPadrao: 'Escola Imaculada',
};
