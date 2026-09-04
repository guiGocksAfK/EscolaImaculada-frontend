import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TurmasService } from '../../../core/services/turmas.service';
import { ChamadaService } from '../../../core/services/chamada.service';
import { FaltasJustificadasService } from '../../../core/services/faltas-justificadas.service';
import { Turma } from '../../../core/models/turma.model';
import { ChamadaMensal } from '../../../core/models/chamada.model';
import { baixarChamadaMensalPdf } from '../../../core/pdf/relatorio-pdf';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import { PreferenciasService } from '../../../core/util/preferencias';

function chaveJustificada(alunoId: string, data: string): string {
  return `${alunoId}|${data}`;
}

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
  private readonly faltasService = inject(FaltasJustificadasService);
  private readonly prefs = inject(PreferenciasService);

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
  readonly justificadas = signal<Set<string>>(new Set());
  readonly carregando = signal(false);

  turmaId = '';
  mes =
    this.prefs.ler<number>('export-chamada.mes') ??
    new Date().getMonth() + 1;
  ano =
    this.prefs.ler<number>('export-chamada.ano') ?? new Date().getFullYear();

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      const ultima = this.prefs.ler<string>('export-chamada.turmaId');
      if (l.length === 1) {
        this.turmaId = l[0].id;
      } else if (ultima && l.some((t) => t.id === ultima)) {
        this.turmaId = ultima;
      }
      if (this.turmaId) this.carregar();
    });
  }

  get turmaNome(): string {
    return this.turmas().find((t) => t.id === this.turmaId)?.nome ?? '';
  }

  carregar(): void {
    if (!this.turmaId) return;
    this.prefs.salvar('export-chamada.turmaId', this.turmaId);
    this.prefs.salvar('export-chamada.mes', this.mes);
    this.prefs.salvar('export-chamada.ano', this.ano);
    const fim = iniciarCarregamento(this.carregando);
    this.dados.set(null);
    forkJoin({
      dados: this.chamadaService.getMes(this.turmaId, this.ano, this.mes),
      justificadas: this.faltasService.listar({ turmaId: this.turmaId }),
    }).subscribe({
      next: ({ dados, justificadas }) => {
        this.dados.set(dados);
        this.justificadas.set(
          new Set(justificadas.map((f) => chaveJustificada(f.alunoId, f.data))),
        );
        fim();
      },
      error: () => fim(),
    });
  }

  diaCurto(iso: string): string {
    return iso.slice(8, 10);
  }

  ehJustificada(alunoId: string, dia: string): boolean {
    return this.justificadas().has(chaveJustificada(alunoId, dia));
  }

  celulaTexto(status: string | null, alunoId: string, dia: string): string {
    if (status === 'F' && this.ehJustificada(alunoId, dia)) return 'FJ';
    return status ?? '·';
  }

  baixarPdf(): void {
    const d = this.dados();
    if (d) baixarChamadaMensalPdf(d, this.turmaNome, this.justificadas());
  }
}
