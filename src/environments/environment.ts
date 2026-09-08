export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  // Street View Static API (foto da fachada em "Dados da escola"). Vazio =
  // a tela mostra só o link "abrir no Google Maps", sem a foto.
  googleMapsApiKey: '',
  // Nome mostrado na tela de login — antes de autenticar não há como buscar
  // o nome real da escola no backend. Depois do login, o app usa o nome
  // cadastrado em "Dados da escola" em todo o resto (menu, PDFs etc.).
  nomeEscolaPadrao: 'Escola Imaculada',
};
