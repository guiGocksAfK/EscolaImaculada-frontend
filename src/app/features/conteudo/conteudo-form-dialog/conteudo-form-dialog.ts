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

import { TurmasService } from '../../../core/services/turmas.service';
import { Turma } from '../../../core/models/turma.model';
import {
  RegistroConteudo,
  RegistroConteudoCreate,
} from '../../../core/models/conteudo.model';
import { fromISODate, toISODate } from '../../../core/date/iso-date';

export interface ConteudoFormData {
  registro?: RegistroConteudo;
  turmaIdInicial?: string;
}

export type ConteudoFormResult = RegistroConteudoCreate;

@Component({
  selector: 'app-conteudo-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
  templateUrl: './conteudo-form-dialog.html',
  styleUrl: './conteudo-form-dialog.scss',
})
export class ConteudoFormDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly turmasService = inject(TurmasService);
  private readonly ref = inject(
    MatDialogRef<ConteudoFormDialog, ConteudoFormResult>,
  );
  private readonly data = inject<ConteudoFormData>(MAT_DIALOG_DATA);

  readonly turmas = signal<Turma[]>([]);
  readonly edicao = !!this.data.registro;

  readonly form = this.fb.group({
    turmaId: ['', [Validators.required]],
    data: this.fb.control<Date | null>(new Date(), {
      validators: [Validators.required],
    }),
    conteudo: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (!this.edicao && !this.form.value.turmaId) {
        const inicial =
          this.data.turmaIdInicial || (l.length === 1 ? l[0].id : '');
        if (inicial) this.form.patchValue({ turmaId: inicial });
      }
    });

    if (this.data.registro) {
      const r = this.data.registro;
      this.form.patchValue({
        turmaId: r.turmaId,
        data: fromISODate(r.data),
        conteudo: r.conteudo,
      });
    }
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.ref.close({
      turmaId: v.turmaId,
      data: toISODate(v.data!),
      conteudo: v.conteudo.trim(),
    });
  }
}
