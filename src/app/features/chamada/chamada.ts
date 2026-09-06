import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { TurmasService } from '../../core/services/turmas.service';
import { Turma } from '../../core/models/turma.model';
import { PreferenciasService } from '../../core/util/preferencias';
import { ChamadaDia } from './chamada-dia/chamada-dia';
import { ChamadaMensal } from './chamada-mensal/chamada-mensal';
import { Faltas } from './faltas/faltas';

@Component({
  selector: 'app-chamada',
  imports: [
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    ChamadaDia,
    ChamadaMensal,
    Faltas,
  ],
  template: `
    <div class="cabecalho">
      <h1>Chamada</h1>
      <mat-form-field class="turma">
        <mat-label>Turma</mat-label>
        <mat-select [(ngModel)]="turmaId" (ngModelChange)="onTurmaChange()">
          <mat-option value="">Todas as turmas</mat-option>
          @for (t of turmas(); track t.id) {
            <mat-option [value]="t.id">{{ t.nome }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    <mat-tab-group>
      <mat-tab label="Chamada do dia">
        <app-chamada-dia [turmaId]="turmaId" />
      </mat-tab>
      <mat-tab label="Visão mensal">
        <app-chamada-mensal [turmaId]="turmaId" />
      </mat-tab>
      <mat-tab label="Faltas justificadas">
        <app-faltas [turmaId]="turmaId" />
      </mat-tab>
    </mat-tab-group>
  `,
  styles: `
    .cabecalho {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .cabecalho h1 {
      margin: 0;
    }
    .turma {
      width: 240px;
    }
    :host ::ng-deep .mat-mdc-tab-body-content {
      padding: 1.25rem 0.25rem;
    }
  `,
})
export class Chamada {
  private readonly turmasService = inject(TurmasService);
  private readonly prefs = inject(PreferenciasService);

  readonly turmas = signal<Turma[]>([]);

  /** Turma selecionada, compartilhada por todas as abas de chamada. */
  turmaId = this.prefs.ler<string>('chamada.turmaId') ?? '';

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (l.length === 1) {
        this.turmaId = l[0].id;
      } else if (this.turmaId && !l.some((t) => t.id === this.turmaId)) {
        this.turmaId = '';
      }
      this.prefs.salvar('chamada.turmaId', this.turmaId);
    });
  }

  onTurmaChange(): void {
    this.prefs.salvar('chamada.turmaId', this.turmaId);
  }
}
