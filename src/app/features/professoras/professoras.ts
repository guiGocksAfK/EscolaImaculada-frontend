import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProfessorasService } from '../../core/services/professoras.service';
import { ProfessoraDetalhe } from '../../core/models/usuario.model';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../shared/confirm-dialog/confirm-dialog';
import {
  ProfessoraFormData,
  ProfessoraFormDialog,
  ProfessoraFormResult,
} from './professora-form-dialog/professora-form-dialog';

@Component({
  selector: 'app-professoras',
  imports: [
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './professoras.html',
  styleUrl: './professoras.scss',
})
export class Professoras {
  private readonly service = inject(ProfessorasService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly colunas = ['nome', 'cpf', 'nascimento', 'turmas', 'acoes'];
  readonly professoras = signal<ProfessoraDetalhe[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  constructor() {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.service.listarDetalhado().subscribe({
      next: (l) => {
        this.professoras.set(l);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar as professoras.');
        this.carregando.set(false);
      },
    });
  }

  formatarCpf(cpf: string): string {
    const d = (cpf ?? '').replace(/\D/g, '');
    return d.length === 11
      ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
      : cpf;
  }

  nova(): void {
    this.abrirForm();
  }

  editar(p: ProfessoraDetalhe): void {
    this.abrirForm(p);
  }

  excluir(p: ProfessoraDetalhe): void {
    if (p.totalTurmas > 0) {
      this.snack.open(
        `${p.nome} tem ${p.totalTurmas} turma(s). Reatribua antes de excluir.`,
        undefined,
        { duration: 4000 },
      );
      return;
    }
    const dados: ConfirmDialogData = {
      titulo: 'Excluir professora',
      mensagem: `Excluir o acesso de ${p.nome}? Ela não conseguirá mais entrar no sistema.`,
      confirmar: 'Excluir',
      perigo: true,
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.service.remover(p.id).subscribe({
          next: () => {
            this.snack.open('Professora excluída.', undefined, {
              duration: 2500,
            });
            this.carregar();
          },
          error: (e) =>
            this.snack.open(
              e?.error?.message ?? 'Não foi possível excluir.',
              undefined,
              { duration: 3500 },
            ),
        });
      });
  }

  private abrirForm(professora?: ProfessoraDetalhe): void {
    const data: ProfessoraFormData = { professora };
    this.dialog
      .open(ProfessoraFormDialog, { data })
      .afterClosed()
      .subscribe((res: ProfessoraFormResult | undefined) => {
        if (!res) return;
        const req = professora
          ? this.service.atualizar(professora.id, res)
          : this.service.criar({ ...res, senha: res.senha ?? '' });
        req.subscribe({
          next: () => {
            this.snack.open(
              professora ? 'Dados atualizados.' : 'Professora cadastrada.',
              undefined,
              { duration: 2500 },
            );
            this.carregar();
          },
          error: (e) =>
            this.snack.open(
              e?.error?.message ?? 'Não foi possível salvar.',
              undefined,
              { duration: 3500 },
            ),
        });
      });
  }
}
