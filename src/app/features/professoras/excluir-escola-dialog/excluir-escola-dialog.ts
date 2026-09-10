import { Component, inject, signal } from '@angular/core';
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

/**
 * Confirmação da exclusão da escola. Devolve a senha digitada (string) ao
 * fechar no "Excluir tudo"; `undefined` se cancelar.
 */
@Component({
  selector: 'app-excluir-escola-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Excluir escola</h2>
    <mat-dialog-content>
      <p class="aviso">
        Isso apaga <strong>a escola inteira</strong> — turmas, alunos,
        chamadas, conteúdos, avaliações e todas as contas (inclusive a sua).
        Não tem como desfazer.
      </p>
      <form class="form" [formGroup]="form" (ngSubmit)="confirmar()">
        <mat-form-field>
          <mat-label>Confirme com a sua senha</mat-label>
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
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button
        mat-flat-button
        color="warn"
        [disabled]="form.invalid"
        (click)="confirmar()"
      >
        Excluir tudo
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .aviso {
        margin: 0 0 1rem;
        font-size: 0.9rem;
        line-height: 1.45;
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
export class ExcluirEscolaDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ref = inject(MatDialogRef<ExcluirEscolaDialog, string>);

  readonly mostrar = signal(false);
  readonly form = this.fb.group({
    senha: ['', [Validators.required]],
  });

  confirmar(): void {
    if (this.form.invalid) return;
    this.ref.close(this.form.getRawValue().senha);
  }
}
