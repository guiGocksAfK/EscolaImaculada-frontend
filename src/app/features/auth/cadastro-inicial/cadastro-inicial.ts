import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-cadastro-inicial',
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="wrap">
      <section class="feature-stub">
        <mat-icon>apartment</mat-icon>
        <h2>Cadastro inicial da escola</h2>
        <p>
          Aqui a diretora cria a própria conta e a escola juntas. Formulário em
          construção.
        </p>
        <a routerLink="/login">Voltar ao login</a>
      </section>
    </div>
  `,
  styles: `
    .wrap {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
    }
    .feature-stub {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      text-align: center;
      max-width: 380px;
      color: var(--mat-sys-on-surface-variant, #6b7280);
    }
    .feature-stub mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: var(--mat-sys-primary, #1565c0);
    }
    .feature-stub h2 {
      margin: 0;
      color: var(--mat-sys-on-surface, #1f2937);
    }
  `,
})
export class CadastroInicial {}
