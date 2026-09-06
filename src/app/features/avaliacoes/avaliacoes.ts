import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TurmasService } from '../../core/services/turmas.service';
import { AlunosService } from '../../core/services/alunos.service';
import { AvaliacoesService } from '../../core/services/avaliacoes.service';
import { iniciarCarregamento } from '../../core/util/carregamento';
import { PreferenciasService } from '../../core/util/preferencias';
import { Turma } from '../../core/models/turma.model';
import { Aluno } from '../../core/models/aluno.model';
import { Avaliacao } from '../../core/models/avaliacao.model';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../shared/confirm-dialog/confirm-dialog';
import {
  AvaliacaoFormData,
  AvaliacaoFormDialog,
  AvaliacaoFormResult,
} from './avaliacao-form-dialog/avaliacao-form-dialog';

interface GrupoReferencia {
  chave: string;
  itens: Avaliacao[];
}

interface GrupoTurma {
  chave: string;
  rotulo: string;
  referencias: GrupoReferencia[];
}

@Component({
  selector: 'app-avaliacoes',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './avaliacoes.html',
  styleUrl: './avaliacoes.scss',
})
export class Avaliacoes {
  private readonly turmasService = inject(TurmasService);
  private readonly alunosService = inject(AlunosService);
  private readonly service = inject(AvaliacoesService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly prefs = inject(PreferenciasService);

  readonly turmas = signal<Turma[]>([]);
  readonly alunos = signal<Aluno[]>([]);
  readonly registros = signal<Avaliacao[]>([]);
  readonly carregando = signal(false);
  readonly carregou = signal(false);
  readonly erro = signal<string | null>(null);
  readonly busca = signal('');

  filtroTurma = this.prefs.ler<string>('avaliacoes.filtroTurma') ?? '';
  filtroAluno = this.prefs.ler<string>('avaliacoes.filtroAluno') ?? '';

  private readonly registrosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.registros();
    return this.registros().filter((a) => {
      const alunoNome = a.aluno?.nome?.toLowerCase() ?? '';
      const turmaNome = a.turma?.nome?.toLowerCase() ?? '';
      return (
        alunoNome.includes(termo) ||
        turmaNome.includes(termo) ||
        a.referencia.toLowerCase().includes(termo) ||
        a.texto.toLowerCase().includes(termo)
      );
    });
  });

  /**
   * Alunos da turma selecionada sem nenhuma avaliação registrada (em
   * qualquer referência). Só faz sentido olhando a turma toda — some se um
   * aluno específico estiver filtrado.
   */
  readonly semAvaliacao = computed<Aluno[] | null>(() => {
    if (!this.filtroTurma || this.filtroAluno) return null;
    const comAvaliacao = new Set(this.registros().map((r) => r.alunoId));
    return this.alunos().filter((a) => !comAvaliacao.has(a.id));
  });

  readonly grupos = computed<GrupoTurma[]>(() => {
    const ordenados = [...this.registrosFiltrados()].sort((a, b) => {
      const turma = (a.turma?.nome ?? '').localeCompare(b.turma?.nome ?? '');
      if (turma !== 0) return turma;
      const referencia = a.referencia.localeCompare(b.referencia);
      if (referencia !== 0) return referencia;
      return (a.aluno?.nome ?? '').localeCompare(b.aluno?.nome ?? '');
    });

    const turmasMap = new Map<string, Map<string, Avaliacao[]>>();
    for (const a of ordenados) {
      const turmaChave = a.turma?.nome ?? 'Sem turma';
      let referencias = turmasMap.get(turmaChave);
      if (!referencias) {
        referencias = new Map();
        turmasMap.set(turmaChave, referencias);
      }
      const itens = referencias.get(a.referencia);
      if (itens) itens.push(a);
      else referencias.set(a.referencia, [a]);
    }

    return Array.from(turmasMap.entries()).map(([turmaChave, referencias]) => ({
      chave: turmaChave,
      rotulo: turmaChave,
      referencias: Array.from(referencias.entries()).map(
        ([referenciaChave, itens]) => ({ chave: referenciaChave, itens }),
      ),
    }));
  });

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (this.filtroTurma && !l.some((t) => t.id === this.filtroTurma)) {
        this.filtroTurma = '';
        this.filtroAluno = '';
      }
      if (this.filtroTurma) {
        this.alunosService
          .listar({ turmaId: this.filtroTurma })
          .subscribe((alunos) => {
            this.alunos.set(alunos);
            if (
              this.filtroAluno &&
              !alunos.some((a) => a.id === this.filtroAluno)
            ) {
              this.filtroAluno = '';
            }
          });
      }
    });
    this.carregar();
  }

  carregar(): void {
    this.erro.set(null);
    this.prefs.salvar('avaliacoes.filtroTurma', this.filtroTurma);
    this.prefs.salvar('avaliacoes.filtroAluno', this.filtroAluno);
    const fim = iniciarCarregamento(this.carregando);
    this.service
      .listar({
        turmaId: this.filtroTurma || undefined,
        alunoId: this.filtroAluno || undefined,
      })
      .subscribe({
        next: (l) => {
          this.registros.set(l);
          this.carregou.set(true);
          fim();
        },
        error: () => {
          this.erro.set('Não foi possível carregar as avaliações.');
          this.carregou.set(true);
          fim();
        },
      });
  }

  aoMudarTurma(): void {
    this.filtroAluno = '';
    this.alunos.set([]);
    if (this.filtroTurma) {
      this.alunosService
        .listar({ turmaId: this.filtroTurma })
        .subscribe((l) => this.alunos.set(l));
    }
    this.carregar();
  }

  nova(alunoId?: string): void {
    this.abrirForm(undefined, alunoId);
  }

  editar(a: Avaliacao): void {
    this.abrirForm(a);
  }

  excluir(a: Avaliacao): void {
    const dados: ConfirmDialogData = {
      titulo: 'Excluir avaliação',
      mensagem: `Excluir a avaliação de ${a.aluno?.nome ?? 'aluno'} (${a.referencia})?`,
      confirmar: 'Excluir',
      perigo: true,
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.service.remover(a.id).subscribe({
          next: () => {
            this.snack.open('Avaliação excluída.', undefined, {
              duration: 2500,
            });
            this.carregar();
          },
          error: () =>
            this.snack.open('Não foi possível excluir.', undefined, {
              duration: 3000,
            }),
        });
      });
  }

  private abrirForm(avaliacao?: Avaliacao, alunoId?: string): void {
    const data: AvaliacaoFormData = {
      avaliacao,
      turmaIdInicial: this.filtroTurma,
      alunoIdInicial: alunoId ?? this.filtroAluno,
    };
    this.dialog
      .open(AvaliacaoFormDialog, { data })
      .afterClosed()
      .subscribe((res: AvaliacaoFormResult | undefined) => {
        if (!res) return;
        const req = avaliacao
          ? this.service.atualizar(avaliacao.id, res)
          : this.service.criar(res);
        req.subscribe({
          next: () => {
            this.snack.open(
              avaliacao ? 'Avaliação atualizada.' : 'Avaliação registrada.',
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
