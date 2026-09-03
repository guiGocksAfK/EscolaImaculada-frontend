import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TurmasService } from '../../../core/services/turmas.service';
import { ChamadaService } from '../../../core/services/chamada.service';
import { Turma } from '../../../core/models/turma.model';
import { ChamadaMensal } from '../../../core/models/chamada.model';
import { baixarChamadaMensalPdf } from '../../../core/pdf/relatorio-pdf';
import { iniciarCarregamento } from '../../../core/util/carregamento';

@Component({
  selector: 'app-export-chamada',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './export-chamada.html',
  styleUrl: './export-chamada.scss',
})
export class ExportChamada {
  private readonly turmasService = inject(TurmasService);
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

  readonly turmas = signal<Turma[]>([]);
  readonly dados = signal<ChamadaMensal | null>(null);
  readonly carregando = signal(false);

  turmaId = '';
  mes = new Date().getMonth() + 1;
  ano = new Date().getFullYear();

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (l.length === 1) {
        this.turmaId = l[0].id;
        this.carregar();
      }
    });
  }

  get turmaNome(): string {
    return this.turmas().find((t) => t.id === this.turmaId)?.nome ?? '';
  }

  carregar(): void {
    if (!this.turmaId) return;
    const fim = iniciarCarregamento(this.carregando);
    this.dados.set(null);
    this.chamadaService.getMes(this.turmaId, this.ano, this.mes).subscribe({
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

  baixarPdf(): void {
    const d = this.dados();
    if (d) baixarChamadaMensalPdf(d, this.turmaNome);
  }
}
