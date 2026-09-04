import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TurmasService } from '../../../core/services/turmas.service';
import { RelatoriosService } from '../../../core/services/relatorios.service';
import { Turma } from '../../../core/models/turma.model';
import { RelatorioResumo, ResumoAluno } from '../../../core/models/relatorio.model';
import { baixarResumoPdf } from '../../../core/pdf/relatorio-pdf';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import {
  lerPreferencia,
  salvarPreferencia,
} from '../../../core/util/preferencias';

@Component({
  selector: 'app-resumo-anual',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './resumo-anual.html',
  styleUrl: './resumo-anual.scss',
})
export class ResumoAnual {
  private readonly turmasService = inject(TurmasService);
  private readonly service = inject(RelatoriosService);

  readonly anos = [0, 1, 2].map((d) => new Date().getFullYear() - d);
  readonly colunas = ['aluno', 'presencas', 'faltas', 'justificadas', 'avaliacao'];

  readonly turmas = signal<Turma[]>([]);
  readonly resumo = signal<RelatorioResumo | null>(null);
  readonly carregando = signal(false);

  turmaId = '';
  ano = lerPreferencia<number>('resumo-anual.ano') ?? new Date().getFullYear();

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      const ultima = lerPreferencia<string>('resumo-anual.turmaId');
      if (l.length === 1) {
        this.turmaId = l[0].id;
      } else if (ultima && l.some((t) => t.id === ultima)) {
        this.turmaId = ultima;
      }
      if (this.turmaId) this.carregar();
    });
  }

  carregar(): void {
    if (!this.turmaId) return;
    salvarPreferencia('resumo-anual.turmaId', this.turmaId);
    salvarPreferencia('resumo-anual.ano', this.ano);
    const fim = iniciarCarregamento(this.carregando);
    this.resumo.set(null);
    this.service.resumoPorAluno(this.turmaId, this.ano).subscribe({
      next: (r) => {
        this.resumo.set(r);
        fim();
      },
      error: () => fim(),
    });
  }

  textoAvaliacao(l: ResumoAluno): string {
    if (l.avaliacoes.length === 0) return '—';
    return l.avaliacoes
      .map((a) => `(${a.referencia}) ${a.texto}`)
      .join('\n\n');
  }

  baixarPdf(): void {
    const r = this.resumo();
    if (r) baixarResumoPdf(r);
  }
}
