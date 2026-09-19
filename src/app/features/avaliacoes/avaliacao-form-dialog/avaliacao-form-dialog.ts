import { Component, OnInit, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { TurmasService } from '../../../core/services/turmas.service';
import { AlunosService } from '../../../core/services/alunos.service';
import { AvaliacoesService } from '../../../core/services/avaliacoes.service';
import { ReautenticacaoService } from '../../../core/auth/reautenticacao.service';
import { mensagemErroAoSalvar } from '../../../core/util/erro-http';
import { Turma } from '../../../core/models/turma.model';
import { Aluno } from '../../../core/models/aluno.model';
import { Avaliacao } from '../../../core/models/avaliacao.model';

export interface AvaliacaoFormData {
  avaliacao?: Avaliacao;
  turmaIdInicial?: string;
  alunoIdInicial?: string;
}

function referenciaPadrao(): string {
  const hoje = new Date();
  // 1º semestre = fev–jul; 2º = ago–dez (mesma definição do backend/relatórios).
  const semestre = hoje.getMonth() + 1 <= 7 ? '1º' : '2º';
  return `${semestre} semestre ${hoje.getFullYear()}`;
}

@Component({
  selector: 'app-avaliacao-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './avaliacao-form-dialog.html',
  styleUrl: './avaliacao-form-dialog.scss',
})
export class AvaliacaoFormDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly turmasService = inject(TurmasService);
  private readonly alunosService = inject(AlunosService);
  private readonly service = inject(AvaliacoesService);
  private readonly reautenticacao = inject(ReautenticacaoService);
  /** Fecha com `true` só depois que a API confirmou o salvamento. */
  private readonly ref = inject(MatDialogRef<AvaliacaoFormDialog, boolean>);
  private readonly data = inject<AvaliacaoFormData>(MAT_DIALOG_DATA);

  readonly turmas = signal<Turma[]>([]);
  readonly alunos = signal<Aluno[]>([]);
  readonly edicao = !!this.data.avaliacao;
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly form = this.fb.group({
    turmaId: ['', [Validators.required]],
    alunoId: ['', [Validators.required]],
    referencia: [referenciaPadrao(), [Validators.required, Validators.maxLength(60)]],
    texto: ['', [Validators.required, Validators.maxLength(4000)]],
  });

  ngOnInit(): void {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (!this.edicao && !this.form.value.turmaId) {
        const inicial =
          this.data.turmaIdInicial || (l.length === 1 ? l[0].id : '');
        if (inicial) {
          this.form.patchValue({ turmaId: inicial });
          this.carregarAlunos(inicial, this.data.alunoIdInicial);
        }
      }
    });

    if (this.data.avaliacao) {
      const a = this.data.avaliacao;
      this.form.patchValue({
        turmaId: a.turmaId,
        alunoId: a.alunoId,
        referencia: a.referencia,
        texto: a.texto,
      });
      this.carregarAlunos(a.turmaId, a.alunoId);
    }

    this.form.controls.turmaId.valueChanges.subscribe((id) => {
      this.form.patchValue({ alunoId: '' });
      if (id) this.carregarAlunos(id);
      else this.alunos.set([]);
    });
  }

  private carregarAlunos(turmaId: string, manterAlunoId?: string): void {
    this.alunosService.listar({ turmaId }).subscribe((l) => {
      this.alunos.set(l);
      if (manterAlunoId) this.form.patchValue({ alunoId: manterAlunoId });
    });
  }

  /**
   * Salva daqui mesmo e só fecha com a confirmação da API. Antes o diálogo
   * fechava devolvendo os dados e a tela salvava depois — se a API falhasse,
   * o texto já tinha sido descartado junto com o diálogo.
   */
  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.salvando()) return;

    const v = this.form.getRawValue();
    const dto = {
      turmaId: v.turmaId,
      alunoId: v.alunoId,
      referencia: v.referencia.trim(),
      texto: v.texto.trim(),
    };
    const existente = this.data.avaliacao;

    this.salvando.set(true);
    this.erro.set(null);
    this.reautenticacao
      .executar(() =>
        existente
          ? this.service.atualizar(existente.id, dto)
          : this.service.criar(dto),
      )
      .subscribe({
        next: () => this.ref.close(true),
        error: (err: unknown) => {
          this.salvando.set(false);
          this.erro.set(mensagemErroAoSalvar(err));
        },
      });
  }
}
