export const environment = {
  production: true,
  // Front (Vercel) e back (Render) ficam em domínios diferentes, então isso
  // precisa ser a URL completa da API — não dá pra usar caminho relativo
  // como em dev. TODO: trocar pela URL real assim que o serviço no Render
  // existir (ex.: 'https://escolaimaculada-backend.onrender.com'), e
  // conferir que bate com o wildcard *.onrender.com liberado no CSP do
  // index.html.
  apiUrl: 'https://TODO-DEFINIR.onrender.com',
  // Fallback do nome na tela de login (a tela busca GET /escola/publica
  // primeiro; este valor só aparece se o backend não responder).
  nomeEscolaPadrao: 'Escola Imaculada',
};
