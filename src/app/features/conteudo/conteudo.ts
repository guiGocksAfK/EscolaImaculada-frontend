import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TurmasService } from '../../core/services/turmas.service';
import { ConteudoService } from '../../core/services/conteudo.service';
import { iniciarCarregamento } from '../../core/util/carregamento';
import { PreferenciasService } from '../../core/util/preferencias';
import { fromISODate, toISODate } from '../../core/date/iso-date';
import { Turma } from '../../core/models/turma.model';
import { RegistroConteudo } from '../../core/models/conteudo.model';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../shared/confirm-dialog/confirm-dialog';
import {
  ConteudoFormData,
  ConteudoFormDialog,
  ConteudoFormResult,
} from './conteudo-form-dialog/conteudo-form-dialog';
import { camposDoRegistro, linhasParaExibicao } from './campos-conteudo';

const NOMES_MES = [
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

const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

interface GrupoSemana {
  chave: string;
  rotulo: string;
  itens: RegistroConteudo[];
}

interface GrupoMes {
  chave: string;
  rotulo: string;
  semanas: GrupoSemana[];
}

interface DiaDaSemana {
  iso: string;
  label: string;
  hoje: boolean;
  registro: RegistroConteudo | null;
}

function segundaDaSemana(d: Date): Date {
  const data = new Date(d);
  const dia = data.getDay(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  data.setDate(data.getDate() + diff);
  data.setHours(0, 0, 0, 0);
  return data;
}

function formatarDiaMes(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Component({
  selector: 'app-conteudo',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './conteudo.html',
  styleUrl: './conteudo.scss',
})
export class Conteudo {
  private readonly turmasService = inject(TurmasService);
  private readonly service = inject(ConteudoService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly prefs = inject(PreferenciasService);

  readonly turmas = signal<Turma[]>([]);
  readonly registros = signal<RegistroConteudo[]>([]);
  readonly carregando = signal(false);
  readonly carregou = signal(false);
  readonly erro = signal<string | null>(null);
  readonly busca = signal('');

  readonly linhas = linhasParaExibicao;
  readonly campos = camposDoRegistro;

  filtroTurma = this.prefs.ler<string>('conteudo.filtroTurma') ?? '';

  /** Guia da semana atual — só faz sentido com uma turma específica selecionada. */
  readonly semanaAtual = computed<DiaDaSemana[] | null>(() => {
    if (!this.filtroTurma) return null;
    const hojeIso = toISODate(new Date());
    const seg = segundaDaSemana(new Date());
    const dias: DiaDaSemana[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(seg);
      d.setDate(d.getDate() + i);
      const iso = toISODate(d);
      dias.push({
        iso,
        label: `${DIAS_SEMANA[i]} ${formatarDiaMes(d)}`,
        hoje: iso === hojeIso,
        registro: this.registros().find((r) => r.data === iso) ?? null,
      });
    }
    return dias;
  });

  private readonly registrosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.registros();
    return this.registros().filter((r) => {
      const turmaNome = r.turma?.nome?.toLowerCase() ?? '';
      return (
        turmaNome.includes(termo) || r.conteudo.toLowerCase().includes(termo)
      );
    });
  });

  readonly grupos = computed<GrupoMes[]>(() => {
    const ordenados = [...this.registrosFiltrados()].sort((a, b) =>
      b.data.localeCompare(a.data),
    );
    const meses = new Map<string, Map<string, RegistroConteudo[]>>();
    for (const r of ordenados) {
      const mesChave = r.data.slice(0, 7); // YYYY-MM
      const semanaChave = toISODate(segundaDaSemana(fromISODate(r.data)!));
      let semanas = meses.get(mesChave);
      if (!semanas) {
        semanas = new Map();
        meses.set(mesChave, semanas);
      }
      const itens = semanas.get(semanaChave);
      if (itens) itens.push(r);
      else semanas.set(semanaChave, [r]);
    }
    return Array.from(meses.entries()).map(([mesChave, semanas]) => ({
      chave: mesChave,
      rotulo: this.rotuloMes(mesChave),
      semanas: Array.from(semanas.entries()).map(([semanaChave, itens]) => ({
        chave: semanaChave,
        rotulo: this.rotuloSemana(semanaChave),
        itens,
      })),
    }));
  });

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (this.filtroTurma && !l.some((t) => t.id === this.filtroTurma)) {
        this.filtroTurma = '';
        this.carregar();
      }
    });
    this.carregar();
  }

  carregar(): void {
    this.erro.set(null);
    this.prefs.salvar('conteudo.filtroTurma', this.filtroTurma);
    const fim = iniciarCarregamento(this.carregando);
    this.service.listar({ turmaId: this.filtroTurma || undefined }).subscribe({
      next: (l) => {
        this.registros.set(l);
        this.carregou.set(true);
        fim();
      },
      error: () => {
        this.erro.set('Não foi possível carregar os registros.');
        this.carregou.set(true);
        fim();
      },
    });
  }

  novo(dataInicial?: string): void {
    this.abrirForm(undefined, dataInicial);
  }

  editar(r: RegistroConteudo): void {
    this.abrirForm(r);
  }

  excluir(r: RegistroConteudo): void {
    const dados: ConfirmDialogData = {
      titulo: 'Excluir registro',
      mensagem: `Excluir o conteúdo de ${r.turma?.nome ?? 'turma'} do dia ${r.data}?`,
      confirmar: 'Excluir',
      perigo: true,
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.service.remover(r.id).subscribe({
          next: () => {
            this.snack.open('Registro excluído.', undefined, { duration: 2500 });
            this.carregar();
          },
          error: () =>
            this.snack.open('Não foi possível excluir.', undefined, {
              duration: 3000,
            }),
        });
      });
  }

  private rotuloMes(chave: string): string {
    const [ano, mes] = chave.split('-').map(Number);
    return `${NOMES_MES[mes - 1]} de ${ano}`;
  }

  private rotuloSemana(segundaIso: string): string {
    const seg = fromISODate(segundaIso)!;
    const sex = new Date(seg);
    sex.setDate(sex.getDate() + 4);
    return `Semana de ${formatarDiaMes(seg)} a ${formatarDiaMes(sex)}`;
  }

  private abrirForm(registro?: RegistroConteudo, dataInicial?: string): void {
    const data: ConteudoFormData = {
      registro,
      turmaIdInicial: this.filtroTurma,
      dataInicial,
    };
    this.dialog
      .open(ConteudoFormDialog, { data })
      .afterClosed()
      .subscribe((res: ConteudoFormResult | undefined) => {
        if (!res) return;
        const req = registro
          ? this.service.atualizar(registro.id, res)
          : this.service.criar(res);
        req.subscribe({
          next: () => {
            this.snack.open(
              registro ? 'Registro atualizado.' : 'Conteúdo registrado.',
              undefined,
              { duration: 2500 },
            );
            this.carregar();
          },
          error: () =>
            this.snack.open('Não foi possível salvar.', undefined, {
              duration: 3000,
            }),
        });
      });
  }
}
