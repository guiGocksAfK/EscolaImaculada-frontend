import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';
import { toISODate } from '../../../core/date/iso-date';

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const senha = grupo.get('senha')?.value;
  const confirmar = grupo.get('confirmarSenha')?.value;
  return senha && confirmar && senha !== confirmar
    ? { senhasDiferentes: true }
    : null;
}

@Component({
  selector: 'app-cadastro-inicial',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './cadastro-inicial.html',
  styleUrl: './cadastro-inicial.scss',
})
export class CadastroInicial {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly esconderSenha = signal(true);

  readonly form = this.fb.group({
    escola: this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(120)]],
      endereco: ['', [Validators.required, Validators.maxLength(200)]],
    }),
    diretora: this.fb.group(
      {
        nome: ['', [Validators.required, Validators.maxLength(120)]],
        cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
        dataNascimento: this.fb.control<Date | null>(null, {
          validators: [Validators.required],
        }),
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmarSenha: ['', [Validators.required]],
      },
      { validators: senhasIguais },
    ),
  });

  get diretora() {
    return this.form.controls.diretora;
  }

  get escola() {
    return this.form.controls.escola;
  }

  enviar(): void {
    if (this.form.invalid || this.carregando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);

    const escola = this.escola.getRawValue();
    const d = this.diretora.getRawValue();

    this.auth
      .cadastroInicial({
        escola: {
          nome: escola.nome.trim(),
          endereco: escola.endereco.trim(),
        },
        diretora: {
          nome: d.nome.trim(),
          cpf: d.cpf.replace(/\D/g, ''),
          dataNascimento: toISODate(d.dataNascimento!),
          senha: d.senha,
        },
      })
      .subscribe({
        next: () => this.router.navigateByUrl('/inicio'),
        error: (err) => {
          this.carregando.set(false);
          this.erro.set(this.mensagemErro(err?.status));
        },
      });
  }

  private mensagemErro(status: number | undefined): string {
    if (status === 409) {
      return 'Já existe uma conta com esse CPF. Use a tela de login para entrar.';
    }
    if (status === 400) {
      return 'Verifique os dados informados e tente novamente.';
    }
    return 'Não foi possível concluir o cadastro. Tente novamente.';
  }
}
