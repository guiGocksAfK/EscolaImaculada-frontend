export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  // Fallback do nome na tela de login. A tela tenta GET /escola/publica
  // (sem token) primeiro; este valor só aparece se o backend não responder
  // ou se a instância tiver mais de uma escola cadastrada.
  nomeEscolaPadrao: 'Escola Imaculada',
};
