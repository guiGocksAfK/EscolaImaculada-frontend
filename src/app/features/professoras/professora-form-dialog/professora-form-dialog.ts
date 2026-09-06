import { Component, OnInit, inject } from '@angular/core';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProfessoraDetalhe } from '../../../core/models/usuario.model';
import { fromISODate, toISODate } from '../../../core/date/iso-date';

export interface ProfessoraFormData {
  professora?: ProfessoraDetalhe;
}

export interface ProfessoraFormResult {
  nome: string;
  /** Ausente na edição = mantém o CPF atual. */
  cpf?: string;
  dataNascimento?: string;
  senha?: string;
}

@Component({
  selector: 'app-professora-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './professora-form-dialog.html',
  styleUrl: './professora-form-dialog.scss',
})
export class ProfessoraFormDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ref = inject(
    MatDialogRef<ProfessoraFormDialog, ProfessoraFormResult>,
  );
  protected readonly data = inject<ProfessoraFormData>(MAT_DIALOG_DATA);

  readonly edicao = !!this.data.professora;
  esconderSenha = true;

  readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    // Na edição o CPF é opcional (chega mascarado da API; só envia se trocar).
    cpf: [
      '',
      this.data.professora
        ? [Validators.pattern(/^\d{11}$/)]
        : [Validators.required, Validators.pattern(/^\d{11}$/)],
    ],
    dataNascimento: this.fb.control<Date | null>(null),
    senha: [
      '',
      this.data.professora
        ? [Validators.minLength(6)]
        : [Validators.required, Validators.minLength(6)],
    ],
  });

  ngOnInit(): void {
    if (this.data.professora) {
      const p = this.data.professora;
      this.form.patchValue({
        nome: p.nome,
        // Não prefill do CPF — o valor da API é mascarado.
        dataNascimento: fromISODate(p.dataNascimento),
      });
    }
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const cpf = v.cpf.replace(/\D/g, '');
    this.ref.close({
      nome: v.nome.trim(),
      cpf: cpf ? cpf : undefined,
      dataNascimento: v.dataNascimento ? toISODate(v.dataNascimento) : undefined,
      senha: v.senha ? v.senha : undefined,
    });
  }
}
