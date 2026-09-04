import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ChamadaService } from '../../../core/services/chamada.service';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import {
  lerPreferencia,
  salvarPreferencia,
} from '../../../core/util/preferencias';
import { ChamadaMensal as ChamadaMensalModel } from '../../../core/models/chamada.model';

@Component({
  selector: 'app-chamada-mensal',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './chamada-mensal.html',
  styleUrl: './chamada-mensal.scss',
})
export class ChamadaMensal {
  private readonly chamadaService = inject(ChamadaService);

  readonly meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  readonly anos = [0, 1, 2].map((d) => new Date().getFullYear() - d);

  readonly turmaId = input<string>('');

  readonly dados = signal<ChamadaMensalModel | null>(null);
  readonly carregando = signal(false);

  mes = lerPreferencia<number>('chamada-mensal.mes') ?? new Date().getMonth() + 1;
  ano = lerPreferencia<number>('chamada-mensal.ano') ?? new Date().getFullYear();

  constructor() {
    effect(() => {
      if (this.turmaId()) {
        this.carregar();
      } else {
        this.dados.set(null);
      }
    });
  }

  carregar(): void {
    const turmaId = this.turmaId();
    if (!turmaId) return;
    salvarPreferencia('chamada-mensal.mes', this.mes);
    salvarPreferencia('chamada-mensal.ano', this.ano);
    const fim = iniciarCarregamento(this.carregando);
    this.dados.set(null);
    this.chamadaService.getMes(turmaId, this.ano, this.mes).subscribe({
      next: (d) => {
        this.dados.set(d);
        fim();
      },
      error: () => fim(),
    });
  }

  diaCurto(iso: string): string {
    return iso.slice(8, 10);
  }
}
