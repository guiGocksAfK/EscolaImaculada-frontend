const PREFIX = 'ei.pref.';

/**
 * Preferências leves de UI (última turma escolhida, último filtro, etc.),
 * persistidas no navegador para a tela não abrir vazia. Nada sensível —
 * só ids e valores de filtro. Se o localStorage não estiver disponível
 * (modo privado, quota cheia), falha em silêncio.
 */
export function lerPreferencia<T = string>(chave: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + chave);
    return raw !== null ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function salvarPreferencia<T>(chave: string, valor: T): void {
  try {
    if (valor === '' || valor === null || valor === undefined) {
      localStorage.removeItem(PREFIX + chave);
    } else {
      localStorage.setItem(PREFIX + chave, JSON.stringify(valor));
    }
  } catch {
    /* ignora */
  }
}
