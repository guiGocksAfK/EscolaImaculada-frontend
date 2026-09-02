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

import { TurmasService } from '../../../../core/services/turmas.service';
import { AlunosService } from '../../../../core/services/alunos.service';
import { Turma } from '../../../../core/models/turma.model';
import { Aluno } from '../../../../core/models/aluno.model';
import {
  FaltaJustificada,
  FaltaJustificadaCreate,
} from '../../../../core/models/falta-justificada.model';
import { fromISODate, toISODate } from '../../../../core/date/iso-date';

export interface FaltaFormData {
  falta?: FaltaJustificada;
  turmaIdInicial?: string;
}

export type FaltaFormResult = FaltaJustificadaCreate;

@Component({
  selector: 'app-falta-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
  templateUrl: './falta-form-dialog.html',
  styleUrl: './falta-form-dialog.scss',
})
export class FaltaFormDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly turmasService = inject(TurmasService);
  private readonly alunosService = inject(AlunosService);
  private readonly ref = inject(MatDialogRef<FaltaFormDialog, FaltaFormResult>);
  private readonly data = inject<FaltaFormData>(MAT_DIALOG_DATA);

  readonly turmas = signal<Turma[]>([]);
  readonly alunos = signal<Aluno[]>([]);
  readonly edicao = !!this.data.falta;

  readonly form = this.fb.group({
    turmaId: ['', [Validators.required]],
    alunoId: ['', [Validators.required]],
    data: this.fb.control<Date | null>(new Date(), {
      validators: [Validators.required],
    }),
    motivo: ['', [Validators.required, Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (!this.edicao && !this.form.value.turmaId) {
        const inicial =
          this.data.turmaIdInicial ?? (l.length === 1 ? l[0].id : '');
        if (inicial) {
          this.form.patchValue({ turmaId: inicial });
          this.carregarAlunos(inicial);
        }
      }
    });

    if (this.data.falta) {
      const f = this.data.falta;
      const turmaId = f.aluno?.turmaId ?? '';
      this.form.patchValue({
        turmaId,
        alunoId: f.alunoId,
        data: fromISODate(f.data),
        motivo: f.motivo,
      });
      if (turmaId) this.carregarAlunos(turmaId);
    }

    this.form.controls.turmaId.valueChanges.subscribe((id) => {
      this.form.patchValue({ alunoId: '' });
      if (id) this.carregarAlunos(id);
      else this.alunos.set([]);
    });
  }

  private carregarAlunos(turmaId: string): void {
    this.alunosService
      .listar({ turmaId })
      .subscribe((l) => this.alunos.set(l));
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.ref.close({
      alunoId: v.alunoId,
      data: toISODate(v.data!),
      motivo: v.motivo.trim(),
    });
  }
}
