import { Injectable, signal } from '@angular/core';

/**
 * Estado global do "servidor acordando".
 *
 * No plano free do Render a API hiberna depois de ~15 min sem tráfego, e a
 * primeira requisição depois disso demora (~30-60s) até a instância voltar.
 * Enquanto isso o `servidorAcordandoInterceptor` refaz a chamada de tempos
 * em tempos e o `ServidorAcordandoOverlay` mostra uma tela explicando.
 */
@Injectable({ providedIn: 'root' })
export class ServidorAcordandoService {
  /** Nº de requisições à API "presas" (passaram do limite ou deram erro de rede). */
  private readonly presas = signal(0);

  /** Overlay visível? */
  readonly acordando = signal(false);

  /** Quantas novas tentativas já foram feitas na rodada atual (só p/ exibir). */
  readonly tentativas = signal(0);

  marcarPresa(): void {
    this.presas.update((n) => n + 1);
    this.acordando.set(true);
  }

  liberarPresa(): void {
    this.presas.update((n) => Math.max(0, n - 1));
    if (this.presas() === 0) {
      this.acordando.set(false);
      this.tentativas.set(0);
    }
  }

  registrarTentativa(): void {
    this.tentativas.update((n) => n + 1);
  }
}
