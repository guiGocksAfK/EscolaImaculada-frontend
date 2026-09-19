import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth/auth.service';
import { AlunosService } from '../../core/services/alunos.service';
import { TurmasService } from '../../core/services/turmas.service';
import { iniciarCarregamento } from '../../core/util/carregamento';
import { PreferenciasService } from '../../core/util/preferencias';
import { minhaTurmaId } from '../../core/util/minha-turma';
import { Turma } from '../../core/models/turma.model';
import {
  Aluno,
  STATUS_ALUNO,
  STATUS_ALUNO_LABEL,
  StatusAluno,
} from '../../core/models/aluno.model';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../shared/confirm-dialog/confirm-dialog';
import {
  AlunoFormData,
  AlunoFormDialog,
} from './aluno-form-dialog/aluno-form-dialog';

@Component({
  selector: 'app-alunos',
  imports: [
    DatePipe,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './alunos.html',
  styleUrl: './alunos.scss',
})
export class Alunos {
  private readonly alunosService = inject(AlunosService);
  private readonly turmasService = inject(TurmasService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly prefs = inject(PreferenciasService);

  readonly statusOpcoes = STATUS_ALUNO;
  readonly statusLabel = STATUS_ALUNO_LABEL;
  private readonly colunasBase = ['nome', 'turma', 'nascimento', 'status'];

  readonly turmas = signal<Turma[]>([]);
  /** Turma da qual o usuário é a responsável, se houver (marca "(sua turma)" no seletor). */
  readonly minhaTurma = signal<string | null>(null);
  readonly alunos = signal<Aluno[]>([]);
  readonly carregando = signal(false);
  readonly carregou = signal(false);
  readonly erro = signal<string | null>(null);

  filtroTurma = this.prefs.ler<string>('alunos.filtroTurma') ?? '';
  filtroStatus: StatusAluno | '' =
    this.prefs.ler<StatusAluno | ''>('alunos.filtroStatus') ?? 'ATIVO';

  readonly podeGerenciar = computed(() => this.auth.hasPapel('DIRETORA'));
  readonly colunas = computed(() =>
    this.podeGerenciar() ? [...this.colunasBase, 'acoes'] : this.colunasBase,
  );

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      this.minhaTurma.set(minhaTurmaId(l, this.auth.usuario()?.id));
      if (this.filtroTurma && !l.some((t) => t.id === this.filtroTurma)) {
        this.filtroTurma = '';
        this.carregar();
      } else if (!this.filtroTurma && this.minhaTurma()) {
        // Sem filtro salvo: já abre na turma da qual ela é responsável.
        this.filtroTurma = this.minhaTurma()!;
        this.carregar();
      }
    });
    this.carregar();
  }

  carregar(): void {
    this.erro.set(null);
    this.prefs.salvar('alunos.filtroTurma', this.filtroTurma);
    this.prefs.salvar('alunos.filtroStatus', this.filtroStatus);
    const fim = iniciarCarregamento(this.carregando);
    this.alunosService
      .listar({
        turmaId: this.filtroTurma || undefined,
        status: this.filtroStatus || undefined,
      })
      .subscribe({
        next: (lista) => {
          this.alunos.set(lista);
          this.carregou.set(true);
          fim();
        },
        error: () => {
          this.erro.set('Não foi possível carregar os alunos.');
          this.carregou.set(true);
          fim();
        },
      });
  }

  idade(a: Aluno): string {
    const nasc = new Date(`${a.dataNascimento}T00:00:00`);
    if (isNaN(nasc.getTime())) return '';
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
    return `${anos} ano${anos === 1 ? '' : 's'}`;
  }

  rotuloStatus(a: Aluno): string {
    return STATUS_ALUNO_LABEL[a.status];
  }

  classeStatus(a: Aluno): string {
    return `chip chip--${a.status.toLowerCase()}`;
  }

  novo(): void {
    if (!this.podeGerenciar()) return;
    this.abrirForm();
  }

  editar(aluno: Aluno): void {
    if (!this.podeGerenciar()) return;
    this.abrirForm(aluno);
  }

  mudarStatus(aluno: Aluno, status: StatusAluno): void {
    if (!this.podeGerenciar()) return;
    if (status === aluno.status) return;

    const sair = status !== 'ATIVO';
    const aplicar = () =>
      this.alunosService.alterarStatus(aluno.id, status).subscribe({
        next: () => {
          this.snack.open(
            `${aluno.nome} agora está ${STATUS_ALUNO_LABEL[status].toLowerCase()}.`,
            undefined,
            { duration: 2500 },
          );
          this.carregar();
        },
        error: () =>
          this.snack.open('Não foi possível alterar.', undefined, {
            duration: 3000,
          }),
      });

    if (!sair) {
      aplicar();
      return;
    }

    const dados: ConfirmDialogData = {
      titulo: `Marcar como ${STATUS_ALUNO_LABEL[status].toLowerCase()}`,
      mensagem: `${aluno.nome} sai da chamada ativa, mas todo o histórico é mantido. Confirmar?`,
      confirmar: STATUS_ALUNO_LABEL[status],
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => ok && aplicar());
  }

  excluir(aluno: Aluno): void {
    if (!this.podeGerenciar()) return;
    const dados: ConfirmDialogData = {
      titulo: 'Excluir aluno',
      mensagem: `Excluir "${aluno.nome}" apaga o cadastro e o histórico. Para tirar da chamada sem perder o histórico, use "Transferido". Excluir mesmo assim?`,
      confirmar: 'Excluir',
      perigo: true,
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.alunosService.remover(aluno.id).subscribe({
          next: () => {
            this.snack.open('Aluno excluído.', undefined, { duration: 2500 });
            this.carregar();
          },
          error: () =>
            this.snack.open('Não foi possível excluir.', undefined, {
              duration: 3000,
            }),
        });
      });
  }

  private abrirForm(aluno?: Aluno): void {
    const data: AlunoFormData = {
      aluno,
      turmaIdInicial: this.filtroTurma || undefined,
    };
    // O diálogo salva sozinho e só fecha com `true` depois da confirmação da
    // API; se falhar, ele continua aberto mostrando o erro, com os dados.
    this.dialog
      .open<AlunoFormDialog, AlunoFormData, boolean>(AlunoFormDialog, { data })
      .afterClosed()
      .subscribe((salvo) => {
        if (!salvo) return;
        this.snack.open(
          aluno ? 'Aluno atualizado.' : 'Aluno cadastrado.',
          undefined,
          { duration: 2500 },
        );
        this.carregar();
      });
  }
}
