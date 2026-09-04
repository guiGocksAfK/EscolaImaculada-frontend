import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { ChamadaService } from '../../../core/services/chamada.service';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import { toISODate } from '../../../core/date/iso-date';
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

  readonly hoje = toISODate(new Date());
  private readonly scrollBox =
    viewChild<ElementRef<HTMLDivElement>>('scrollBox');

  mes = new Date().getMonth() + 1;
  ano = new Date().getFullYear();

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
    const fim = iniciarCarregamento(this.carregando);
    this.dados.set(null);
    this.chamadaService.getMes(turmaId, this.ano, this.mes).subscribe({
      next: (d) => {
        this.dados.set(d);
        fim();
        this.rolarParaHoje();
      },
      error: () => fim(),
    });
  }

  diaCurto(iso: string): string {
    return iso.slice(8, 10);
  }

  private rolarParaHoje(): void {
    setTimeout(() => {
      this.scrollBox()
        ?.nativeElement.querySelector<HTMLElement>('.hoje')
        ?.scrollIntoView({ inline: 'center', block: 'nearest' });
    });
  }
}
