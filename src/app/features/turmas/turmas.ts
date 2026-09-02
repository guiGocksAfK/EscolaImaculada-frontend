import { Component, computed, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth/auth.service';
import { TurmasService } from '../../core/services/turmas.service';
import { PERIODO_LABEL, Turma } from '../../core/models/turma.model';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../shared/confirm-dialog/confirm-dialog';
import {
  TurmaFormData,
  TurmaFormDialog,
} from './turma-form-dialog/turma-form-dialog';

@Component({
  selector: 'app-turmas',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './turmas.html',
  styleUrl: './turmas.scss',
})
export class Turmas {
  private readonly turmasService = inject(TurmasService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly colunas = ['nome', 'periodo', 'anoLetivo', 'professora', 'acoes'];

  rotuloPeriodo(t: Turma): string {
    return PERIODO_LABEL[t.periodo];
  }

  readonly turmas = signal<Turma[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly podeGerenciar = computed(() => this.auth.hasPapel('DIRETORA'));

  constructor() {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.turmasService.listar().subscribe({
      next: (lista) => {
        this.turmas.set(lista);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar as turmas.');
        this.carregando.set(false);
      },
    });
  }

  nova(): void {
    this.abrirForm();
  }

  editar(turma: Turma): void {
    this.abrirForm(turma);
  }

  remover(turma: Turma): void {
    const dados: ConfirmDialogData = {
      titulo: 'Excluir turma',
      mensagem: `Excluir "${turma.nome}"? O histórico vinculado também deixará de aparecer.`,
      confirmar: 'Excluir',
      perigo: true,
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.turmasService.remover(turma.id).subscribe({
          next: () => {
            this.snack.open('Turma excluída.', undefined, { duration: 2500 });
            this.carregar();
          },
          error: () =>
            this.snack.open('Não foi possível excluir.', undefined, {
              duration: 3000,
            }),
        });
      });
  }

  private abrirForm(turma?: Turma): void {
    const data: TurmaFormData = { turma };
    this.dialog
      .open(TurmaFormDialog, { data })
      .afterClosed()
      .subscribe((valor) => {
        if (!valor) return;
        const req = turma
          ? this.turmasService.atualizar(turma.id, valor)
          : this.turmasService.criar(valor);
        req.subscribe({
          next: () => {
            this.snack.open(
              turma ? 'Turma atualizada.' : 'Turma criada.',
              undefined,
              { duration: 2500 },
            );
            this.carregar();
          },
          error: () =>
            this.snack.open('Não foi possível salvar.', undefined, {
              duration: 3000,
            }),
        });
      });
  }
}
