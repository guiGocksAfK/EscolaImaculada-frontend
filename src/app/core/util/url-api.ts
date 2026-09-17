import { environment } from '../../../environments/environment';

/**
 * A URL é uma chamada para a nossa própria API (e não para um terceiro)?
 *
 * Compara a ORIGEM resolvida em vez do começo da string: `/escola` e
 * `//atacante.com/escola` começam os dois com `/`, mas a segunda é
 * protocol-relative e sai para outro host. Como é essa resposta que decide
 * se o token de sessão viaja junto, errar aqui entrega a sessão inteira.
 *
 * Mesma origem do app também conta: em um deploy onde front e back ficam
 * atrás do mesmo domínio, a apiUrl vira caminho relativo.
 */
export function ehChamadaDaApi(url: string): boolean {
  try {
    const alvo = new URL(url, location.origin).origin;
    const api = new URL(environment.apiUrl, location.origin).origin;
    return alvo === api || alvo === location.origin;
  } catch {
    // URL malformada, `blob:`, `data:`… nunca é a nossa API.
    return false;
  }
}
