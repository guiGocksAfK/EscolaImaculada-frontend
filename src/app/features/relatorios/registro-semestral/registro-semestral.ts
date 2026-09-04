import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TurmasService } from '../../../core/services/turmas.service';
import { AlunosService } from '../../../core/services/alunos.service';
import { ChamadaService } from '../../../core/services/chamada.service';
import { ConteudoService } from '../../../core/services/conteudo.service';
import { FaltasJustificadasService } from '../../../core/services/faltas-justificadas.service';
import { AvaliacoesService } from '../../../core/services/avaliacoes.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Turma } from '../../../core/models/turma.model';
import { baixarRegistroSemestralPdf } from '../../../core/pdf/relatorio-pdf';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import { PreferenciasService } from '../../../core/util/preferencias';

const MESES_SEMESTRE: Record<1 | 2, number[]> = {
  1: [2, 3, 4, 5, 6, 7],
  2: [8, 9, 10, 11, 12],
};

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
  private readonly alunosService = inject(AlunosService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly conteudoService = inject(ConteudoService);
  private readonly faltasService = inject(FaltasJustificadasService);
  private readonly avaliacoesService = inject(AvaliacoesService);
  private readonly auth = inject(AuthService);
  private readonly prefs = inject(PreferenciasService);

  readonly anos = [0, 1, 2].map((d) => new Date().getFullYear() - d);
  readonly turmas = signal<Turma[]>([]);
  readonly carregando = signal(false);
  readonly gerado = signal<ResumoGeracao | null>(null);

  turmaId = '';
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

    const meses = MESES_SEMESTRE[this.semestre];
    const fim = iniciarCarregamento(this.carregando);
    this.gerado.set(null);

    forkJoin({
      alunos: this.alunosService.listar({ turmaId: this.turmaId }),
      meses: forkJoin(
        meses.map((mes) =>
          this.chamadaService.getMes(this.turmaId, this.ano, mes),
        ),
      ),
      conteudos: this.conteudoService.listar({ turmaId: this.turmaId }),
      justificadas: this.faltasService.listar({ turmaId: this.turmaId }),
      avaliacoes: this.avaliacoesService.listar({ turmaId: this.turmaId }),
    }).subscribe({
      next: ({ alunos, meses: dadosMeses, conteudos, justificadas, avaliacoes }) => {
        const noSemestre = (iso: string) => {
          const [anoStr, mesStr] = iso.split('-');
          return Number(anoStr) === this.ano && meses.includes(Number(mesStr));
        };
        const conteudosDoSemestre = conteudos
          .filter((c) => noSemestre(c.data))
          .sort((a, b) => a.data.localeCompare(b.data));
        const justificadasDoSemestre = justificadas
          .filter((f) => noSemestre(f.data))
          .sort((a, b) => a.data.localeCompare(b.data));

        baixarRegistroSemestralPdf({
          turmaNome: this.turmaNome,
          semestre: this.semestre,
          ano: this.ano,
          meses: dadosMeses,
          alunos,
          conteudos: conteudosDoSemestre,
          justificadas: justificadasDoSemestre,
          avaliacoes,
          responsavelNome: this.auth.usuario()?.nome ?? '',
        });

        this.gerado.set({
          meses: dadosMeses.filter((m) => m.dias.length > 0).length,
          conteudos: conteudosDoSemestre.length,
          justificadas: justificadasDoSemestre.length,
          alunos: alunos.length,
        });
        fim();
      },
      error: () => fim(),
    });
  }
}
