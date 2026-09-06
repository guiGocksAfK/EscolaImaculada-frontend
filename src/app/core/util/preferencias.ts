import { Injectable, inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

const PREFIX = 'ei.pref.';

/**
 * Preferências leves de UI (última turma escolhida, último filtro, etc.),
 * persistidas no navegador para a tela não abrir vazia. Nada sensível —
 * só ids e valores de filtro.
 *
 * A chave é escopada pelo id do usuário logado, então trocar de conta
 * nunca "vaza" a turma/filtro de uma conta pra outra — mesmo sem logout
 * explícito (sessão expirada, abas simultâneas com contas diferentes
 * etc.), já que cada usuário lê/escreve em chaves próprias no localStorage.
 * Se o localStorage não estiver disponível (modo privado, quota cheia),
 * falha em silêncio.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  private readonly auth = inject(AuthService);

  ler<T = string>(chave: string): T | null {
    try {
      const raw = localStorage.getItem(this.chaveCompleta(chave));
      return raw !== null ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  salvar<T>(chave: string, valor: T): void {
    try {
      const chaveCompleta = this.chaveCompleta(chave);
      if (valor === '' || valor === null || valor === undefined) {
        localStorage.removeItem(chaveCompleta);
      } else {
        localStorage.setItem(chaveCompleta, JSON.stringify(valor));
      }
    } catch {
      /* ignora */
    }
  }

  private chaveCompleta(chave: string): string {
    const usuarioId = this.auth.usuario()?.id ?? 'anonimo';
    return `${PREFIX}${usuarioId}.${chave}`;
  }
}
