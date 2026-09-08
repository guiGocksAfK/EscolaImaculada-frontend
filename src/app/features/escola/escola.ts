import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EscolaService } from '../../core/services/escola.service';
import { iniciarCarregamento } from '../../core/util/carregamento';

@Component({
  selector: 'app-escola',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './escola.html',
  styleUrl: './escola.scss',
})
export class Escola {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(EscolaService);
  private readonly snack = inject(MatSnackBar);

  readonly carregando = signal(false);
  readonly carregou = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    endereco: ['', [Validators.required, Validators.maxLength(250)]],
  });

  /** Nome/endereço digitados agora, pra atualizar o preview do cabeçalho do
   * PDF em tempo real — não precisa salvar pra ver o resultado. */
  private readonly valoresForm = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly previewNome = computed(
    () => this.valoresForm().nome || 'Nome da escola',
  );
  readonly previewEndereco = computed(() => this.valoresForm().endereco ?? '');
  readonly previewEmitido = `emitido em ${new Date().toLocaleDateString('pt-BR')}`;

  constructor() {
    this.carregar();
  }

  carregar(): void {
    this.erro.set(null);
    const fim = iniciarCarregamento(this.carregando);
    this.service.obter().subscribe({
      next: (e) => {
        this.form.reset({ nome: e.nome, endereco: e.endereco });
        this.carregou.set(true);
        fim();
      },
      error: () => {
        this.erro.set('Não foi possível carregar os dados da escola.');
        this.carregou.set(true);
        fim();
      },
    });
  }

  salvar(): void {
    if (this.form.invalid || this.form.pristine) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    this.service.atualizar(this.form.getRawValue()).subscribe({
      next: (e) => {
        this.form.reset({ nome: e.nome, endereco: e.endereco });
        this.salvando.set(false);
        this.snack.open('Dados da escola atualizados.', undefined, {
          duration: 2500,
        });
      },
      error: (err) => {
        this.salvando.set(false);
        this.snack.open(
          err?.error?.message ?? 'Não foi possível salvar.',
          undefined,
          { duration: 3500 },
        );
      },
    });
  }
}
