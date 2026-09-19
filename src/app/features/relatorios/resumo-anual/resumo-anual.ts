import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';

import { TurmasService } from '../../../core/services/turmas.service';
import { RelatoriosService } from '../../../core/services/relatorios.service';
import { EscolaService } from '../../../core/services/escola.service';
import { AlunosService } from '../../../core/services/alunos.service';
import { Turma } from '../../../core/models/turma.model';
import {
  RelatorioResumo,
  ResumoAluno,
} from '../../../core/models/relatorio.model';
import { baixarResumoPdf } from '../../../core/pdf/relatorio-pdf';
import {
  baixarParecerPdf,
  montarAlunosDoParecer,
} from '../../../core/pdf/parecer-pdf';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import { PreferenciasService } from '../../../core/util/preferencias';

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
    MatInputModule,
  ],
  templateUrl: './resumo-anual.html',
  styleUrl: './resumo-anual.scss',
})
export class ResumoAnual {
  private readonly turmasService = inject(TurmasService);
  private readonly service = inject(RelatoriosService);
  private readonly escolaService = inject(EscolaService);
  private readonly alunosService = inject(AlunosService);
  private readonly prefs = inject(PreferenciasService);
  private readonly snack = inject(MatSnackBar);

  readonly anos = [0, 1, 2].map((d) => new Date().getFullYear() - d);
  readonly colunas = ['aluno', 'presencas', 'faltas', 'justificadas', 'avaliacao'];

  readonly turmas = signal<Turma[]>([]);
  readonly resumo = signal<RelatorioResumo | null>(null);
  readonly carregando = signal(false);

  readonly gerandoParecer = signal(false);

  turmaId = '';
  ano = this.prefs.ler<number>('resumo-anual.ano') ?? new Date().getFullYear();

  /** Mesma divisão do backend: fev–jul é o 1º semestre. */
  semestre: 1 | 2 =
    this.prefs.ler<1 | 2>('resumo-anual.semestre') ??
    (new Date().getMonth() + 1 <= 7 ? 1 : 2);

  /**
   * Dias letivos do parecer. Em branco usa os dias com chamada lançada, mas
   * o número oficial vem do calendário da escola — e é maior sempre que
   * alguém esqueceu de lançar um dia.
   */
  diasLetivos: number | null = null;

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      const ultima = this.prefs.ler<string>('resumo-anual.turmaId');
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
    this.prefs.salvar('resumo-anual.turmaId', this.turmaId);
    this.prefs.salvar('resumo-anual.ano', this.ano);
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

  /**
   * Parecer descritivo: um documento por turma, uma criança por página, no
   * formato que a escola já usa em papel.
   *
   * Junta duas fontes porque nenhuma tem tudo: o registro semestral traz
   * faltas e avaliações do período, e o cadastro do aluno traz filiação e
   * local de nascimento, que o parecer exige na identificação.
   */
  baixarParecer(): void {
    if (!this.turmaId || this.gerandoParecer()) return;
    this.prefs.salvar('resumo-anual.semestre', this.semestre);
    this.gerandoParecer.set(true);

    const turma = this.turmas().find((t) => t.id === this.turmaId);

    forkJoin({
      registro: this.service.registroSemestral(this.turmaId, this.ano, this.semestre),
      alunos: this.alunosService.listar({ turmaId: this.turmaId }),
    }).subscribe({
      next: ({ registro, alunos }) => {
        this.gerandoParecer.set(false);
        const linhas = montarAlunosDoParecer(
          this.semestre,
          registro,
          alunos,
          turma?.nome,
        );
        if (!linhas.length) {
          this.snack.open('Nenhum aluno nesta turma no semestre.', undefined, {
            duration: 3000,
          });
          return;
        }
        baixarParecerPdf({
          escolaNome: this.escolaService.dados()?.nome ?? 'Escola',
          escolaEndereco: this.escolaService.dados()?.endereco,
          ano: this.ano,
          semestre: this.semestre,
          // O responsável pela TURMA, não quem está gerando o PDF: o campo do
          // formulário é "Prof. Regente".
          professoraNome: turma?.professora?.nome ?? registro.responsavelNome,
          diasLetivos: this.diasLetivos ?? registro.atendimentos,
          alunos: linhas,
        });
      },
      error: () => {
        this.gerandoParecer.set(false);
        this.snack.open('Não foi possível gerar o parecer.', undefined, {
          duration: 3000,
        });
      },
    });
  }

  async baixarPdf(): Promise<void> {
    const r = this.resumo();
    if (!r) return;
    try {
      await baixarResumoPdf(r, this.escolaService.dados()?.nome ?? 'Escola');
    } catch {
      this.snack.open('Não foi possível gerar o PDF.', undefined, {
        duration: 3000,
      });
    }
  }
}
