import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { TurmasService } from '../../core/services/turmas.service';
import { Turma } from '../../core/models/turma.model';
import { PreferenciasService } from '../../core/util/preferencias';
import { ChamadaDia } from './chamada-dia/chamada-dia';
import { ChamadaMensal } from './chamada-mensal/chamada-mensal';
import { Faltas } from './faltas/faltas';

const ULTIMA_ABA = 2;

@Component({
  selector: 'app-chamada',
  imports: [
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    ChamadaDia,
    ChamadaMensal,
    Faltas,
  ],
  template: `
    <div class="cabecalho">
      <h1>Chamada</h1>
      <mat-form-field class="turma">
        <mat-label>Turma</mat-label>
        <mat-select [(ngModel)]="turmaId" (ngModelChange)="onTurmaChange()">
          <mat-option value="">Todas as turmas</mat-option>
          @for (t of turmas(); track t.id) {
            <mat-option [value]="t.id">{{ t.nome }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    <mat-tab-group
      [selectedIndex]="abaAtiva()"
      (selectedIndexChange)="selecionarAba($event)"
      [disablePagination]="true"
      (touchstart)="onToqueInicio($event)"
      (touchend)="onToqueFim($event)"
    >
      <mat-tab label="Chamada do dia">
        <app-chamada-dia [turmaId]="turmaId" />
      </mat-tab>
      <mat-tab label="Visão mensal">
        <app-chamada-mensal [turmaId]="turmaId" />
      </mat-tab>
      <mat-tab label="Faltas justificadas">
        <app-faltas [turmaId]="turmaId" />
      </mat-tab>
    </mat-tab-group>
  `,
  styles: `
    .cabecalho {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .cabecalho h1 {
      margin: 0;
    }
    .turma {
      width: 240px;
    }
    :host ::ng-deep .mat-mdc-tab-body-content {
      padding: 1.25rem 0.25rem;
    }
    /* Sem setas de paginação: as abas rolam com o dedo e o conteúdo
       muda arrastando (ver onToqueFim). */
    :host ::ng-deep .mat-mdc-tab-header-pagination {
      display: none;
    }
    :host ::ng-deep .mat-mdc-tab-label-container {
      overflow-x: auto;
      scrollbar-width: none;
    }
    :host ::ng-deep .mat-mdc-tab-label-container::-webkit-scrollbar {
      display: none;
    }
  `,
})
export class Chamada {
  private readonly turmasService = inject(TurmasService);
  private readonly prefs = inject(PreferenciasService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly turmas = signal<Turma[]>([]);
  readonly abaAtiva = signal(0);

  /** Turma selecionada, compartilhada por todas as abas de chamada. */
  turmaId = this.prefs.ler<string>('chamada.turmaId') ?? '';

  private toque: { x: number; y: number; t: number } | null = null;

  constructor() {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (l.length === 1) {
        this.turmaId = l[0].id;
      } else if (this.turmaId && !l.some((t) => t.id === this.turmaId)) {
        this.turmaId = '';
      }
      this.prefs.salvar('chamada.turmaId', this.turmaId);
    });
  }

  onTurmaChange(): void {
    this.prefs.salvar('chamada.turmaId', this.turmaId);
  }

  selecionarAba(i: number): void {
    this.abaAtiva.set(i);
    this.manterAbaVisivel();
  }

  // --- Navegação por arrasto (celular) -----------------------------------

  onToqueInicio(e: TouchEvent): void {
    const t = e.changedTouches[0];
    this.toque = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  onToqueFim(e: TouchEvent): void {
    const ini = this.toque;
    this.toque = null;
    if (!ini) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - ini.x;
    const dy = t.clientY - ini.y;

    // precisa ser um arrasto horizontal, rápido e com alcance mínimo
    if (
      Math.abs(dx) < 60 ||
      Math.abs(dx) < Math.abs(dy) * 1.8 ||
      Date.now() - ini.t > 600
    ) {
      return;
    }

    const paraProxima = dx < 0;
    // não troca de aba se o dedo está rolando um conteúdo que ainda tem
    // pra rolar na horizontal (ex.: a grade da visão mensal)
    if (this.rolandoConteudoInterno(e.target as HTMLElement | null, paraProxima)) {
      return;
    }

    const alvo = this.abaAtiva() + (paraProxima ? 1 : -1);
    if (alvo >= 0 && alvo <= ULTIMA_ABA) {
      this.selecionarAba(alvo);
    }
  }

  private rolandoConteudoInterno(
    el: HTMLElement | null,
    paraProxima: boolean,
  ): boolean {
    let n = el;
    while (n && !n.classList.contains('mat-mdc-tab-body-content')) {
      const ox = getComputedStyle(n).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) {
        const noInicio = n.scrollLeft <= 0;
        const noFim = n.scrollLeft + n.clientWidth >= n.scrollWidth - 1;
        if (paraProxima ? !noFim : !noInicio) return true;
      }
      n = n.parentElement;
    }
    return false;
  }

  private manterAbaVisivel(): void {
    queueMicrotask(() => {
      const labels =
        this.host.nativeElement.querySelectorAll<HTMLElement>('.mat-mdc-tab');
      labels[this.abaAtiva()]?.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      });
    });
  }
}
