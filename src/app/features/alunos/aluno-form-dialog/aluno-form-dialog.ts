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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';

import {
  Aluno,
  AlunoCreate,
  STATUS_ALUNO,
  STATUS_ALUNO_LABEL,
  StatusAluno,
} from '../../../core/models/aluno.model';
import { Turma } from '../../../core/models/turma.model';
import { TurmasService } from '../../../core/services/turmas.service';

export interface AlunoFormData {
  aluno?: Aluno;
  /** Turma pré-selecionada ao criar (vindo do filtro da lista). */
  turmaIdInicial?: string;
}

export interface AlunoFormResult {
  dados: AlunoCreate;
  status: StatusAluno;
}

@Component({
  selector: 'app-aluno-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
  templateUrl: './aluno-form-dialog.html',
  styleUrl: './aluno-form-dialog.scss',
})
export class AlunoFormDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly turmasService = inject(TurmasService);
  private readonly ref = inject(MatDialogRef<AlunoFormDialog, AlunoFormResult>);
  private readonly data = inject<AlunoFormData>(MAT_DIALOG_DATA);

  readonly statusOpcoes = STATUS_ALUNO;
  readonly statusLabel = STATUS_ALUNO_LABEL;
  readonly turmas = signal<Turma[]>([]);
  readonly edicao = !!this.data.aluno;

  readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    cpf: ['', [Validators.pattern(/^\d{11}$/)]],
    dataNascimento: this.fb.control<Date | null>(null, {
      validators: [Validators.required],
    }),
    nomeMae: ['', [Validators.required]],
    nomePai: [''],
    localNascimento: [''],
    endereco: [''],
    turmaId: ['', [Validators.required]],
    status: this.fb.control<StatusAluno>('ATIVO', {
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.turmasService.listar().subscribe((lista) => this.turmas.set(lista));

    if (this.data.aluno) {
      const a = this.data.aluno;
      this.form.patchValue({
        nome: a.nome,
        cpf: a.cpf,
        dataNascimento: fromISO(a.dataNascimento),
        nomeMae: a.nomeMae,
        nomePai: a.nomePai,
        localNascimento: a.localNascimento,
        endereco: a.endereco,
        turmaId: a.turmaId,
        status: a.status,
      });
    } else if (this.data.turmaIdInicial) {
      this.form.patchValue({ turmaId: this.data.turmaIdInicial });
    }
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.ref.close({
      dados: {
        nome: v.nome.trim(),
        cpf: v.cpf,
        dataNascimento: toISO(v.dataNascimento!),
        nomeMae: v.nomeMae.trim(),
        nomePai: v.nomePai.trim(),
        localNascimento: v.localNascimento.trim(),
        endereco: v.endereco.trim(),
        turmaId: v.turmaId,
      },
      status: v.status,
    });
  }
}

function toISO(d: Date): string {
  const mes = `${d.getMonth() + 1}`.padStart(2, '0');
  const dia = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function fromISO(s: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}
