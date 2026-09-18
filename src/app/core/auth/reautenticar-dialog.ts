import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService, ContaDiferenteError } from './auth.service';

/**
 * Login no meio do trabalho: abre POR CIMA do formulário cujo salvamento
 * voltou 401, sem fechá-lo. Fecha com `true` quando a sessão foi renovada
 * (quem abriu refaz o salvamento); `undefined` se a pessoa cancelar.
 */
@Component({
  selector: 'app-reautenticar-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Sua sessão expirou</h2>
    <mat-dialog-content>
      <p class="aviso">
        Entre de novo para concluir. <strong>O que você escreveu não foi
        perdido</strong> — o formulário continua aberto aqui atrás e é salvo
        assim que você entrar.
      </p>
      @if (nome) {
        <p class="conta">Conta em uso: <strong>{{ nome }}</strong></p>
      }
      <form class="form" [formGroup]="form" (ngSubmit)="entrar()">
        <mat-form-field>
          <mat-label>CPF</mat-label>
          <input
            matInput
            formControlName="cpf"
            inputmode="numeric"
            autocomplete="username"
            maxlength="14"
          />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Senha</mat-label>
          <input
            matInput
            [type]="mostrar() ? 'text' : 'password'"
            formControlName="senha"
            autocomplete="current-password"
          />
          <button
            type="button"
            mat-icon-button
            matSuffix
            (click)="mostrar.set(!mostrar())"
            [attr.aria-label]="mostrar() ? 'Ocultar senha' : 'Mostrar senha'"
          >
            <mat-icon>{{ mostrar() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>
        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [disabled]="entrando()" (click)="ref.close()">
        Cancelar
      </button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || entrando()"
        (click)="entrar()"
      >
        {{ entrando() ? 'Entrando…' : 'Entrar e salvar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .aviso {
        margin: 0 0 0.75rem;
        font-size: 0.9rem;
        line-height: 1.45;
      }
      .conta {
        margin: 0 0 1rem;
        font-size: 0.85rem;
      }
      .form {
        width: 320px;
        max-width: 100%;
      }
      mat-form-field {
        width: 100%;
      }
    `,
  ],
})
export class ReautenticarDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  protected readonly ref = inject(MatDialogRef<ReautenticarDialog, boolean>);

  protected readonly nome = this.auth.usuario()?.nome;
  readonly mostrar = signal(false);
  readonly entrando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly form = this.fb.group({
    cpf: ['', [Validators.required, Validators.minLength(11)]],
    senha: ['', [Validators.required]],
  });

  entrar(): void {
    if (this.form.invalid || this.entrando()) return;
    this.entrando.set(true);
    this.erro.set(null);

    const { cpf, senha } = this.form.getRawValue();
    this.auth.reautenticar({ cpf: cpf.replace(/\D/g, ''), senha }).subscribe({
      next: () => this.ref.close(true),
      error: (err: unknown) => {
        this.entrando.set(false);
        this.erro.set(this.mensagem(err));
      },
    });
  }

  private mensagem(err: unknown): string {
    if (err instanceof ContaDiferenteError) {
      return `Entre com a mesma conta que estava em uso${this.nome ? ` (${this.nome})` : ''} — o formulário aberto é dela.`;
    }
    if (err instanceof HttpErrorResponse && err.status === 401) {
      return 'CPF ou senha inválidos.';
    }
    if (err instanceof HttpErrorResponse && err.status === 0) {
      return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
    }
    return 'Não foi possível entrar. Tente de novo.';
  }
}
