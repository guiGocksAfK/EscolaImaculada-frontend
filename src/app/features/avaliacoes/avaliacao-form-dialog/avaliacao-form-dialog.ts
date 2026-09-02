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
import { Turma } from '../../../core/models/turma.model';
import { Aluno } from '../../../core/models/aluno.model';
import {
  Avaliacao,
  AvaliacaoCreate,
} from '../../../core/models/avaliacao.model';

export interface AvaliacaoFormData {
  avaliacao?: Avaliacao;
  turmaIdInicial?: string;
  alunoIdInicial?: string;
}

export type AvaliacaoFormResult = AvaliacaoCreate;

function referenciaPadrao(): string {
  const hoje = new Date();
  const semestre = hoje.getMonth() < 6 ? '1º' : '2º';
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
  private readonly ref = inject(
    MatDialogRef<AvaliacaoFormDialog, AvaliacaoFormResult>,
  );
  private readonly data = inject<AvaliacaoFormData>(MAT_DIALOG_DATA);

  readonly turmas = signal<Turma[]>([]);
  readonly alunos = signal<Aluno[]>([]);
  readonly edicao = !!this.data.avaliacao;

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

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.ref.close({
      turmaId: v.turmaId,
      alunoId: v.alunoId,
      referencia: v.referencia.trim(),
      texto: v.texto.trim(),
    });
  }
}
