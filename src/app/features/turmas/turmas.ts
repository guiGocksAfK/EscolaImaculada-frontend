import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-turmas',
  imports: [MatIconModule],
  template: `
    <section class="feature-stub">
      <mat-icon>groups</mat-icon>
      <h2>Turmas</h2>
      <p>Módulo em construção.</p>
    </section>
  `,
  styles: `
    .feature-stub {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 3rem 1rem;
      color: var(--mat-sys-on-surface-variant, #6b7280);
      text-align: center;
    }
    .feature-stub mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
    }
    .feature-stub h2 {
      margin: 0;
      color: var(--mat-sys-on-surface, #1f2937);
    }
  `,
})
export class Turmas {}
