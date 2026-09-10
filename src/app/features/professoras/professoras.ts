import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth/auth.service';
import { ProfessorasService } from '../../core/services/professoras.service';
import { EscolaService } from '../../core/services/escola.service';
import { iniciarCarregamento } from '../../core/util/carregamento';
import { ProfessoraDetalhe } from '../../core/models/usuario.model';
import { ResumoEscola } from '../../core/models/escola.model';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../shared/confirm-dialog/confirm-dialog';
import { ExcluirEscolaDialog } from './excluir-escola-dialog/excluir-escola-dialog';
import {
  ProfessoraFormData,
  ProfessoraFormDialog,
  ProfessoraFormResult,
} from './professora-form-dialog/professora-form-dialog';

@Component({
  selector: 'app-professoras',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './professoras.html',
  styleUrl: './professoras.scss',
})
export class Professoras {
  private readonly service = inject(ProfessorasService);
  private readonly escolaService = inject(EscolaService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly colunas = ['nome', 'cpf', 'nascimento', 'turmas', 'acoes'];
  readonly professoras = signal<ProfessoraDetalhe[]>([]);
  readonly carregando = signal(false);
  readonly carregou = signal(false);
  readonly erro = signal<string | null>(null);

  // --- Escola ---
  readonly escola = this.escolaService.dados;
  readonly resumo = signal<ResumoEscola | null>(null);
  readonly editandoEscola = signal(false);
  readonly salvandoEscola = signal(false);
  readonly excluindoEscola = signal(false);
  readonly escolaForm = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    endereco: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
  });

  constructor() {
    this.carregar();
    if (!this.escolaService.dados()) {
      this.escolaService.obter().subscribe({ error: () => {} });
    }
  }

  private carregarResumo(): void {
    this.escolaService.resumo().subscribe({
      next: (r) => this.resumo.set(r),
      error: () => {
        /* card só não mostra os números */
      },
    });
  }

  carregar(): void {
    this.erro.set(null);
    this.carregarResumo();
    const fim = iniciarCarregamento(this.carregando);
    this.service.listarDetalhado().subscribe({
      next: (l) => {
        this.professoras.set(l);
        this.carregou.set(true);
        fim();
      },
      error: () => {
        this.erro.set('Não foi possível carregar as professoras.');
        this.carregou.set(true);
        fim();
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

  // --- Escola: editar nome/endereço ---

  editarEscola(): void {
    const e = this.escola();
    if (!e) return;
    this.escolaForm.reset({ nome: e.nome, endereco: e.endereco });
    this.editandoEscola.set(true);
  }

  cancelarEdicaoEscola(): void {
    this.editandoEscola.set(false);
  }

  salvarEscola(): void {
    if (this.escolaForm.invalid || this.salvandoEscola()) {
      this.escolaForm.markAllAsTouched();
      return;
    }
    this.salvandoEscola.set(true);
    const { nome, endereco } = this.escolaForm.getRawValue();
    this.escolaService.atualizar({ nome: nome.trim(), endereco: endereco.trim() }).subscribe({
      next: () => {
        this.salvandoEscola.set(false);
        this.editandoEscola.set(false);
        this.snack.open('Dados da escola atualizados.', undefined, {
          duration: 2500,
        });
      },
      error: (e) => {
        this.salvandoEscola.set(false);
        this.snack.open(
          e?.error?.message ?? 'Não foi possível salvar.',
          undefined,
          { duration: 3500 },
        );
      },
    });
  }

  // --- Escola: excluir (reautentica por senha) ---

  excluirEscola(): void {
    this.dialog
      .open(ExcluirEscolaDialog)
      .afterClosed()
      .subscribe((senha: string | undefined) => {
        if (!senha || this.excluindoEscola()) return;
        this.excluindoEscola.set(true);
        this.escolaService.excluir(senha).subscribe({
          next: () => {
            this.snack.open('Escola excluída.', undefined, { duration: 3000 });
            this.auth.logout(); // token não vale mais — volta pro login
          },
          error: (e) => {
            this.excluindoEscola.set(false);
            this.snack.open(
              e?.status === 401
                ? 'Senha incorreta.'
                : (e?.error?.message ?? 'Não foi possível excluir a escola.'),
              undefined,
              { duration: 3500 },
            );
          },
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
          : this.service.criar({
              ...res,
              cpf: res.cpf ?? '',
              senha: res.senha ?? '',
            });
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
