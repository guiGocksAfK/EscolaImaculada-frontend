import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AlunosService } from '../../../core/services/alunos.service';
import { ChamadaService } from '../../../core/services/chamada.service';
import { Aluno } from '../../../core/models/aluno.model';
import {
  STATUS_DIA_LABEL,
  StatusDia,
} from '../../../core/models/chamada.model';
import { toISODate } from '../../../core/date/iso-date';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog';

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
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './chamada-dia.html',
  styleUrl: './chamada-dia.scss',
})
export class ChamadaDia {
  private readonly alunosService = inject(AlunosService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly statusOpcoes: StatusDia[] = ['C', 'F'];
  readonly statusLabel = STATUS_DIA_LABEL;

  readonly turmaId = input<string>('');

  readonly alunos = signal<Aluno[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly jaLancada = signal(false);

  data: Date = new Date();

  /** alunoId -> status do dia */
  marcacoes: Record<string, StatusDia> = {};

  readonly resumo = signal({ C: 0, F: 0 });

  private atualizarResumo(): void {
    const vals = Object.values(this.marcacoes);
    this.resumo.set({
      C: vals.filter((v) => v === 'C').length,
      F: vals.filter((v) => v === 'F').length,
    });
  }

  onMarcacaoChange(alunoId: string, status: StatusDia): void {
    if (this.somenteLeitura()) return;
    this.marcacoes[alunoId] = status;
    this.atualizarResumo();
  }

  ehHoje(): boolean {
    return toISODate(this.data) === toISODate(new Date());
  }

  /** Chamada só é editável hoje e enquanto não tiver sido lançada; depois disso é só consulta. */
  somenteLeitura(): boolean {
    return this.jaLancada() || !this.ehHoje();
  }

  /** Só mostra a lista quando há o que consultar: chamada já lançada, ou hoje (pra poder lançar). */
  mostrarRoster(): boolean {
    return this.jaLancada() || this.ehHoje();
  }

  diaAnterior(): void {
    const d = new Date(this.data);
    d.setDate(d.getDate() - 1);
    this.data = d;
    this.carregar();
  }

  diaSeguinte(): void {
    const d = new Date(this.data);
    d.setDate(d.getDate() + 1);
    this.data = d;
    this.carregar();
  }

  constructor() {
    effect(() => {
      if (this.turmaId()) {
        this.carregar();
      } else {
        this.alunos.set([]);
        this.marcacoes = {};
        this.jaLancada.set(false);
        this.resumo.set({ C: 0, F: 0 });
      }
    });
  }

  carregar(): void {
    const turmaId = this.turmaId();
    if (!turmaId) return;
    const iso = toISODate(this.data);
    const fim = iniciarCarregamento(this.carregando);

    forkJoin({
      alunos: this.alunosService.listar({ turmaId, status: 'ATIVO' }),
      dia: this.chamadaService.getDia(turmaId, iso),
    }).subscribe({
      next: ({ alunos, dia }) => {
        this.alunos.set(alunos);
        const prev = new Map(dia.registros.map((r) => [r.alunoId, r.status]));
        this.jaLancada.set(dia.registros.length > 0);
        const m: Record<string, StatusDia> = {};
        for (const a of alunos) m[a.id] = prev.get(a.id) ?? 'C';
        this.marcacoes = m;
        this.atualizarResumo();
        fim();
      },
      error: () => {
        fim();
        this.snack.open('Não foi possível carregar a chamada.', undefined, {
          duration: 3000,
        });
      },
    });
  }

  salvar(): void {
    const turmaId = this.turmaId();
    if (!turmaId || this.alunos().length === 0 || this.somenteLeitura()) return;

    const dados: ConfirmDialogData = {
      titulo: 'Lançar chamada',
      mensagem:
        'Depois de lançada, a chamada deste dia não poderá mais ser editada. Confirmar o lançamento?',
      confirmar: 'Lançar chamada',
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.confirmarSalvar(turmaId);
      });
  }

  private confirmarSalvar(turmaId: string): void {
    this.salvando.set(true);
    this.chamadaService
      .salvarDia({
        turmaId,
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
