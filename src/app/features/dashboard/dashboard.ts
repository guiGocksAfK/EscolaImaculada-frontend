import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/auth/auth.service';

interface Atalho {
  label: string;
  icon: string;
  path: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatCardModule, MatIconModule],
  template: `
    <h1>Olá, {{ auth.usuario()?.nome }}</h1>
    <p class="sub">O que você quer fazer agora?</p>

    <div class="grid">
      @for (a of atalhos; track a.path) {
        <a [routerLink]="a.path" class="atalho">
          <mat-card appearance="outlined">
            <mat-card-content>
              <mat-icon>{{ a.icon }}</mat-icon>
              <span>{{ a.label }}</span>
            </mat-card-content>
          </mat-card>
        </a>
      }
    </div>
  `,
  styles: `
    h1 {
      margin: 0 0 0.25rem;
    }
    .sub {
      color: var(--mat-sys-on-surface-variant, #6b7280);
      margin-top: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .atalho {
      text-decoration: none;
      color: inherit;
    }
    mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.5rem;
      padding: 1.25rem 0.5rem;
    }
    .atalho mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: var(--mat-sys-primary, #1565c0);
    }
    .atalho span {
      font-weight: 600;
    }
  `,
})
export class Dashboard {
  readonly auth = inject(AuthService);

  readonly atalhos: Atalho[] = [
    { label: 'Fazer a chamada', icon: 'fact_check', path: '/chamada' },
    { label: 'Registrar conteúdo', icon: 'menu_book', path: '/conteudo' },
    { label: 'Avaliações', icon: 'rate_review', path: '/avaliacoes' },
    {
      label: 'Faltas justificadas',
      icon: 'event_busy',
      path: '/faltas-justificadas',
    },
    { label: 'Alunos', icon: 'badge', path: '/alunos' },
    { label: 'Relatórios', icon: 'assessment', path: '/relatorios' },
  ];
}
