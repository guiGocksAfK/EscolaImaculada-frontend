import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TurmasService } from '../../../core/services/turmas.service';
import { RelatoriosService } from '../../../core/services/relatorios.service';
import { EscolaService } from '../../../core/services/escola.service';
import { Turma } from '../../../core/models/turma.model';
import { baixarRegistroSemestralPdf } from '../../../core/pdf/relatorio-pdf';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import { PreferenciasService } from '../../../core/util/preferencias';

interface ResumoGeracao {
  meses: number;
  conteudos: number;
  justificadas: number;
  alunos: number;
}

@Component({
  selector: 'app-registro-semestral',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './registro-semestral.html',
  styleUrl: './registro-semestral.scss',
})
export class RegistroSemestral {
  private readonly turmasService = inject(TurmasService);
  private readonly relatorios = inject(RelatoriosService);
  private readonly escolaService = inject(EscolaService);
  private readonly prefs = inject(PreferenciasService);
  private readonly snack = inject(MatSnackBar);

  readonly anos = [0, 1, 2].map((d) => new Date().getFullYear() - d);
  readonly turmas = signal<Turma[]>([]);
  readonly carregando = signal(false);
  readonly gerado = signal<ResumoGeracao | null>(null);

  turmaId = '';
  // Semestre 1 = fev–jul; 2 = ago–dez (mesma definição do backend).
  semestre: 1 | 2 = new Date().getMonth() + 1 <= 7 ? 1 : 2;
  ano = this.prefs.ler<number>('registro-semestral.ano') ?? new Date().getFullYear();

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      const ultima = this.prefs.ler<string>('registro-semestral.turmaId');
      if (l.length === 1) {
        this.turmaId = l[0].id;
      } else if (ultima && l.some((t) => t.id === ultima)) {
        this.turmaId = ultima;
      }
    });
  }

  get turmaNome(): string {
    return this.turmas().find((t) => t.id === this.turmaId)?.nome ?? '';
  }

  gerarPdf(): void {
    if (!this.turmaId) return;
    this.prefs.salvar('registro-semestral.turmaId', this.turmaId);
    this.prefs.salvar('registro-semestral.ano', this.ano);

    const fim = iniciarCarregamento(this.carregando);
    this.gerado.set(null);

    this.relatorios
      .registroSemestral(this.turmaId, this.ano, this.semestre)
      .subscribe({
        next: async (res) => {
          try {
            await baixarRegistroSemestralPdf({
              escolaNome: this.escolaService.dados()?.nome ?? 'Escola',
              turmaNome: res.turmaNome,
              semestre: res.semestre,
              ano: res.ano,
              meses: res.meses,
              alunos: res.alunos,
              conteudos: res.conteudos,
              justificadas: res.justificadas,
              avaliacoes: res.avaliacoes,
              responsavelNome: res.responsavelNome,
            });
            this.gerado.set({
              meses: res.meses.filter((m) => m.dias.length > 0).length,
              conteudos: res.conteudos.length,
              justificadas: res.justificadas.length,
              alunos: res.alunos.length,
            });
          } catch {
            this.snack.open('Não foi possível gerar o PDF.', undefined, {
              duration: 3000,
            });
          } finally {
            fim();
          }
        },
        error: () => {
          this.snack.open(
            'Não foi possível carregar os dados do semestre.',
            undefined,
            { duration: 3000 },
          );
          fim();
        },
      });
  }
}
