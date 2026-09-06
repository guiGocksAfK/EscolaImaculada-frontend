import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FaltasJustificadasService } from '../../../core/services/faltas-justificadas.service';
import { iniciarCarregamento } from '../../../core/util/carregamento';
import { FaltaJustificada } from '../../../core/models/falta-justificada.model';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog';
import {
  FaltaFormData,
  FaltaFormDialog,
  FaltaFormResult,
} from './falta-form-dialog/falta-form-dialog';

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

interface GrupoMes {
  chave: string;
  rotulo: string;
  itens: FaltaJustificada[];
}

@Component({
  selector: 'app-faltas',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  templateUrl: './faltas.html',
  styleUrl: './faltas.scss',
})
export class Faltas {
  private readonly service = inject(FaltasJustificadasService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  readonly registros = signal<FaltaJustificada[]>([]);
  readonly carregando = signal(false);
  readonly carregou = signal(false);
  readonly erro = signal<string | null>(null);
  readonly busca = signal('');

  readonly turmaId = input<string>('');

  private readonly registrosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.registros();
    return this.registros().filter((f) =>
      (f.aluno?.nome ?? '').toLowerCase().includes(termo),
    );
  });

  readonly grupos = computed<GrupoMes[]>(() => {
    const ordenados = [...this.registrosFiltrados()].sort((a, b) =>
      b.data.localeCompare(a.data),
    );
    const mapa = new Map<string, FaltaJustificada[]>();
    for (const f of ordenados) {
      const chave = f.data.slice(0, 7); // YYYY-MM
      const grupo = mapa.get(chave);
      if (grupo) grupo.push(f);
      else mapa.set(chave, [f]);
    }
    return Array.from(mapa.entries()).map(([chave, itens]) => ({
      chave,
      rotulo: this.rotuloMes(chave),
      itens,
    }));
  });

  constructor() {
    effect(() => {
      this.turmaId();
      this.carregar();
    });
  }

  carregar(): void {
    this.erro.set(null);
    const fim = iniciarCarregamento(this.carregando);
    this.service
      .listar({ turmaId: this.turmaId() || undefined })
      .subscribe({
        next: (l) => {
          this.registros.set(l);
          this.carregou.set(true);
          fim();
        },
        error: () => {
          this.erro.set('Não foi possível carregar as justificativas.');
          this.carregou.set(true);
          fim();
        },
      });
  }

  nova(): void {
    this.abrirForm();
  }

  editar(f: FaltaJustificada): void {
    this.abrirForm(f);
  }

  excluir(f: FaltaJustificada): void {
    const dados: ConfirmDialogData = {
      titulo: 'Excluir justificativa',
      mensagem: `Excluir a justificativa de ${f.aluno?.nome ?? 'aluno'} em ${f.data}?`,
      confirmar: 'Excluir',
      perigo: true,
    };
    this.dialog
      .open(ConfirmDialog, { data: dados })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.service.remover(f.id).subscribe({
          next: () => {
            this.snack.open('Justificativa excluída.', undefined, {
              duration: 2500,
            });
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

  private abrirForm(falta?: FaltaJustificada): void {
    const data: FaltaFormData = {
      falta,
      turmaIdInicial: this.turmaId() || undefined,
    };
    this.dialog
      .open(FaltaFormDialog, { data })
      .afterClosed()
      .subscribe((res: FaltaFormResult | undefined) => {
        if (!res) return;
        const req = falta
          ? this.service.atualizar(falta.id, res)
          : this.service.criar(res);
        req.subscribe({
          next: () => {
            this.snack.open(
              falta ? 'Justificativa atualizada.' : 'Justificativa registrada.',
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
