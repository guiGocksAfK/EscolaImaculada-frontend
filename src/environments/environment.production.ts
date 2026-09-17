export const environment = {
  production: true,
  // Front (Vercel) e back (VM da Oracle) ficam em domínios diferentes, então
  // isso precisa ser a URL completa da API — não dá pra usar caminho relativo
  // como em dev. Este mesmo domínio está liberado no connect-src do CSP em
  // DOIS lugares: o header HTTP do vercel.json (o que vale em produção) e a
  // <meta> do index.html (dev). Mudar aqui exige mudar nos dois.
  apiUrl: 'https://escolaimaculada.duckdns.org',
  // Fallback do nome na tela de login (a tela busca GET /escola/publica
  // primeiro; este valor só aparece se o backend não responder).
  nomeEscolaPadrao: 'Escola Imaculada',
};
