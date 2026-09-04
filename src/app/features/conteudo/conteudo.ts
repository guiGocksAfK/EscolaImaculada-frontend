import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TurmasService } from '../../core/services/turmas.service';
import { ConteudoService } from '../../core/services/conteudo.service';
import { iniciarCarregamento } from '../../core/util/carregamento';
import {
  lerPreferencia,
  salvarPreferencia,
} from '../../core/util/preferencias';
import { Turma } from '../../core/models/turma.model';
import { RegistroConteudo } from '../../core/models/conteudo.model';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../shared/confirm-dialog/confirm-dialog';
import {
  ConteudoFormData,
  ConteudoFormDialog,
  ConteudoFormResult,
} from './conteudo-form-dialog/conteudo-form-dialog';

@Component({
  selector: 'app-conteudo',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './conteudo.html',
  styleUrl: './conteudo.scss',
})
export class Conteudo {
  private readonly turmasService = inject(TurmasService);
  private readonly service = inject(ConteudoService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly turmas = signal<Turma[]>([]);
  readonly registros = signal<RegistroConteudo[]>([]);
  readonly carregando = signal(false);
  readonly carregou = signal(false);
  readonly erro = signal<string | null>(null);

  filtroTurma = lerPreferencia<string>('conteudo.filtroTurma') ?? '';

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (this.filtroTurma && !l.some((t) => t.id === this.filtroTurma)) {
        this.filtroTurma = '';
        this.carregar();
      }
    });
    this.carregar();
  }

  carregar(): void {
    this.erro.set(null);
    salvarPreferencia('conteudo.filtroTurma', this.filtroTurma);
    const fim = iniciarCarregamento(this.carregando);
    this.service.listar({ turmaId: this.filtroTurma || undefined }).subscribe({
      next: (l) => {
        this.registros.set(l);
        this.carregou.set(true);
        fim();
      },
      error: () => {
        this.erro.set('Não foi possível carregar os registros.');
        this.carregou.set(true);
        fim();
      },
    });
  }

  novo(): void {
    this.abrirForm();
  }

  editar(r: RegistroConteudo): void {
    this.abrirForm(r);
  }

  excluir(r: RegistroConteudo): void {
    const dados: ConfirmDialogData = {
      titulo: 'Excluir registro',
      mensagem: `Excluir o conteúdo de ${r.turma?.nome ?? 'turma'} do dia ${r.data}?`,
      confirmar: 'Excluir',
      perigo: true,
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.service.remover(r.id).subscribe({
          next: () => {
            this.snack.open('Registro excluído.', undefined, { duration: 2500 });
            this.carregar();
          },
          error: () =>
            this.snack.open('Não foi possível excluir.', undefined, {
              duration: 3000,
            }),
        });
      });
  }

  private abrirForm(registro?: RegistroConteudo): void {
    const data: ConteudoFormData = {
      registro,
      turmaIdInicial: this.filtroTurma,
    };
    this.dialog
      .open(ConteudoFormDialog, { data })
      .afterClosed()
      .subscribe((res: ConteudoFormResult | undefined) => {
        if (!res) return;
        const req = registro
          ? this.service.atualizar(registro.id, res)
          : this.service.criar(res);
        req.subscribe({
          next: () => {
            this.snack.open(
              registro ? 'Registro atualizado.' : 'Conteúdo registrado.',
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
