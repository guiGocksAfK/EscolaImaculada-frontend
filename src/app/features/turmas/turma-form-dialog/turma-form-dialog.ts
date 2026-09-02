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

import {
  PERIODO_LABEL,
  PERIODOS,
  Turma,
  TurmaCreate,
} from '../../../core/models/turma.model';
import {
  ProfessoraResumo,
  ProfessorasService,
} from '../../../core/services/professoras.service';

export interface TurmaFormData {
  turma?: Turma;
}

@Component({
  selector: 'app-turma-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './turma-form-dialog.html',
  styleUrl: './turma-form-dialog.scss',
})
export class TurmaFormDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly professorasService = inject(ProfessorasService);
  private readonly ref = inject(MatDialogRef<TurmaFormDialog, TurmaCreate>);
  private readonly data = inject<TurmaFormData>(MAT_DIALOG_DATA);

  readonly periodos = PERIODOS;
  readonly periodoLabel = PERIODO_LABEL;
  readonly professoras = signal<ProfessoraResumo[]>([]);
  readonly edicao = !!this.data.turma;

  readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(80)]],
    periodo: this.fb.control<(typeof PERIODOS)[number]>('MANHA', {
      validators: [Validators.required],
    }),
    anoLetivo: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(2020), Validators.max(2100)],
    ],
    professoraId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.professorasService
      .listar()
      .subscribe((lista) => this.professoras.set(lista));

    if (this.data.turma) {
      const { nome, periodo, anoLetivo, professoraId } = this.data.turma;
      this.form.patchValue({ nome, periodo, anoLetivo, professoraId });
    }
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.ref.close(this.form.getRawValue() as TurmaCreate);
  }
}
