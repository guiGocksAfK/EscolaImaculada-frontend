import { Component, computed, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth/auth.service';
import { EscolaService } from '../../../core/services/escola.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly escola = inject(EscolaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly esconderSenha = signal(true);

  /** Nome real da escola (endpoint público); cai no padrão se indisponível. */
  readonly nomeEscola = computed(
    () => this.escola.nomePublico() ?? environment.nomeEscolaPadrao,
  );

  readonly form = this.fb.group({
    cpf: ['', [Validators.required, Validators.minLength(11)]],
    senha: ['', [Validators.required]],
  });

  constructor() {
    this.escola.carregarNomePublico();
  }

  entrar(): void {
    if (this.form.invalid || this.carregando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);

    const { cpf, senha } = this.form.getRawValue();

    this.auth.login({ cpf: cpf.replace(/\D/g, ''), senha }).subscribe({
      next: () => {
        const redirect =
          this.route.snapshot.queryParamMap.get('redirect') ?? '/inicio';
        this.router.navigateByUrl(redirect);
      },
      error: (err) => {
        this.carregando.set(false);
        this.erro.set(
          err?.status === 401
            ? 'CPF ou senha inválidos.'
            : 'Não foi possível entrar. Tente novamente.',
        );
      },
    });
  }
}
