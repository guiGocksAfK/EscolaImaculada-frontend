import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ServidorAcordandoService } from './servidor-acordando.service';

/**
 * Tela cheia mostrada enquanto a API está "acordando" (cold start do Render).
 * Não tem botão de fechar de propósito — some sozinha quando o servidor
 * responde (ver `servidorAcordandoInterceptor`). Fica montada na raiz do app.
 */
@Component({
  selector: 'app-servidor-acordando-overlay',
  imports: [MatProgressSpinnerModule],
  template: `
    @if (estado.acordando()) {
      <div class="overlay" role="status" aria-live="polite">
        <div class="cartao">
          <mat-spinner diameter="48" />
          <h2>Ligando o servidor…</h2>
          <p>
            O sistema hiberna depois de um tempo sem uso para economizar
            recursos. Estamos acordando ele agora — costuma levar menos de um
            minuto. Sua ação continua automaticamente assim que ele responder.
          </p>
          @if (estado.tentativas() > 0) {
            <span class="tentativa">tentativa {{ estado.tentativas() }}</span>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(2px);
      }

      .cartao {
        max-width: 340px;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        text-align: center;
        background: var(--mat-sys-surface, #fff);
        border-radius: 16px;
        padding: 1.75rem 1.5rem;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
      }

      h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      p {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.45;
        color: var(--mat-sys-on-surface-variant, #4b5563);
      }

      .tentativa {
        font-size: 0.75rem;
        color: var(--mat-sys-on-surface-variant, #6b7280);
      }
    `,
  ],
})
export class ServidorAcordandoOverlay {
  readonly estado = inject(ServidorAcordandoService);
}
