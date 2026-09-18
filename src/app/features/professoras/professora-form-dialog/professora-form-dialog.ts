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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProfessoraDetalhe } from '../../../core/models/usuario.model';
import { fromISODate, toISODate } from '../../../core/date/iso-date';
import { ProfessorasService } from '../../../core/services/professoras.service';
import { ReautenticacaoService } from '../../../core/auth/reautenticacao.service';
import { mensagemErroAoSalvar } from '../../../core/util/erro-http';

export interface ProfessoraFormData {
  professora?: ProfessoraDetalhe;
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
  private readonly service = inject(ProfessorasService);
  private readonly reautenticacao = inject(ReautenticacaoService);
  /** Fecha com `true` só depois que a API confirmou o salvamento. */
  private readonly ref = inject(MatDialogRef<ProfessoraFormDialog, boolean>);
  protected readonly data = inject<ProfessoraFormData>(MAT_DIALOG_DATA);

  readonly edicao = !!this.data.professora;
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
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
        ? [Validators.minLength(10)]
        : [Validators.required, Validators.minLength(10)],
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

  /**
   * Salva daqui mesmo e só fecha com a confirmação da API — se falhar (ex.:
   * CPF já cadastrado), o diálogo continua aberto com tudo preenchido e a
   * mensagem da API aparece ali mesmo.
   */
  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.salvando()) return;

    const v = this.form.getRawValue();
    const cpf = v.cpf.replace(/\D/g, '');
    const dados = {
      nome: v.nome.trim(),
      // Ausente na edição = mantém o CPF (e a senha) atuais.
      cpf: cpf ? cpf : undefined,
      dataNascimento: v.dataNascimento ? toISODate(v.dataNascimento) : undefined,
      senha: v.senha ? v.senha : undefined,
    };
    const existente = this.data.professora;

    this.salvando.set(true);
    this.erro.set(null);
    this.reautenticacao
      .executar(() =>
        existente
          ? this.service.atualizar(existente.id, dados)
          : this.service.criar({
              ...dados,
              cpf: dados.cpf ?? '',
              senha: dados.senha ?? '',
            }),
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
