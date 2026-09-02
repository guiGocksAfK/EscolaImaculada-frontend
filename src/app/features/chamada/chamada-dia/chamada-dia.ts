import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TurmasService } from '../../../core/services/turmas.service';
import { AlunosService } from '../../../core/services/alunos.service';
import { ChamadaService } from '../../../core/services/chamada.service';
import { Turma } from '../../../core/models/turma.model';
import { Aluno } from '../../../core/models/aluno.model';
import {
  STATUS_DIA,
  STATUS_DIA_LABEL,
  StatusDia,
} from '../../../core/models/chamada.model';
import { toISODate } from '../../../core/date/iso-date';

@Component({
  selector: 'app-chamada-dia',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressBarModule,
  ],
  templateUrl: './chamada-dia.html',
  styleUrl: './chamada-dia.scss',
})
export class ChamadaDia {
  private readonly turmasService = inject(TurmasService);
  private readonly alunosService = inject(AlunosService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly snack = inject(MatSnackBar);

  readonly statusOpcoes = STATUS_DIA;
  readonly statusLabel = STATUS_DIA_LABEL;

  readonly turmas = signal<Turma[]>([]);
  readonly alunos = signal<Aluno[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly jaLancada = signal(false);

  turmaId = '';
  data: Date = new Date();

  /** alunoId -> status do dia */
  marcacoes: Record<string, StatusDia> = {};

  readonly resumo = computed(() => {
    const vals = Object.values(this.marcacoes);
    return {
      C: vals.filter((v) => v === 'C').length,
      F: vals.filter((v) => v === 'F').length,
      D: vals.filter((v) => v === 'D').length,
    };
  });

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (l.length === 1) {
        this.turmaId = l[0].id;
        this.carregar();
      }
    });
  }

  carregar(): void {
    if (!this.turmaId) return;
    const iso = toISODate(this.data);
    this.carregando.set(true);

    forkJoin({
      alunos: this.alunosService.listar({
        turmaId: this.turmaId,
        status: 'ATIVO',
      }),
      dia: this.chamadaService.getDia(this.turmaId, iso),
    }).subscribe({
      next: ({ alunos, dia }) => {
        this.alunos.set(alunos);
        const prev = new Map(dia.registros.map((r) => [r.alunoId, r.status]));
        this.jaLancada.set(dia.registros.length > 0);
        const m: Record<string, StatusDia> = {};
        for (const a of alunos) m[a.id] = prev.get(a.id) ?? 'C';
        this.marcacoes = m;
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.snack.open('Não foi possível carregar a chamada.', undefined, {
          duration: 3000,
        });
      },
    });
  }

  marcarTodos(status: StatusDia): void {
    const m: Record<string, StatusDia> = {};
    for (const a of this.alunos()) m[a.id] = status;
    this.marcacoes = m;
  }

  salvar(): void {
    if (!this.turmaId || this.alunos().length === 0) return;
    this.salvando.set(true);
    this.chamadaService
      .salvarDia({
        turmaId: this.turmaId,
        data: toISODate(this.data),
        registros: this.alunos().map((a) => ({
          alunoId: a.id,
          status: this.marcacoes[a.id] ?? 'C',
        })),
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.jaLancada.set(true);
          this.snack.open('Chamada salva.', undefined, { duration: 2500 });
        },
        error: () => {
          this.salvando.set(false);
          this.snack.open('Não foi possível salvar.', undefined, {
            duration: 3000,
          });
        },
      });
  }
}
