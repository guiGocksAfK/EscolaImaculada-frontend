import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';

import { TurmasService } from '../../../../core/services/turmas.service';
import { ChamadaService } from '../../../../core/services/chamada.service';
import { FaltasJustificadasService } from '../../../../core/services/faltas-justificadas.service';
import { ReautenticacaoService } from '../../../../core/auth/reautenticacao.service';
import { mensagemErroAoSalvar } from '../../../../core/util/erro-http';
import { Turma } from '../../../../core/models/turma.model';
import { Aluno } from '../../../../core/models/aluno.model';
import {
  FaltaJustificada,
  FaltaJustificadaCreate,
} from '../../../../core/models/falta-justificada.model';
import { fromISODate, toISODate } from '../../../../core/date/iso-date';

export interface FaltaFormData {
  falta?: FaltaJustificada;
  turmaIdInicial?: string;
}

@Component({
  selector: 'app-falta-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
  templateUrl: './falta-form-dialog.html',
  styleUrl: './falta-form-dialog.scss',
})
export class FaltaFormDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly turmasService = inject(TurmasService);
  private readonly chamadaService = inject(ChamadaService);
  private readonly service = inject(FaltasJustificadasService);
  private readonly reautenticacao = inject(ReautenticacaoService);
  /** Fecha com `true` só depois que a API confirmou o salvamento. */
  private readonly ref = inject(MatDialogRef<FaltaFormDialog, boolean>);
  private readonly data = inject<FaltaFormData>(MAT_DIALOG_DATA);

  readonly turmas = signal<Turma[]>([]);
  readonly alunos = signal<Array<Pick<Aluno, 'id' | 'nome'>>>([]);
  readonly carregandoAlunos = signal(false);
  readonly edicao = !!this.data.falta;
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly form = this.fb.group({
    turmaId: ['', [Validators.required]],
    alunoId: ['', [Validators.required]],
    data: this.fb.control<Date | null>(new Date(), {
      validators: [Validators.required],
    }),
    motivo: ['', [Validators.required, Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (!this.edicao && !this.form.value.turmaId) {
        const inicial = this.data.turmaIdInicial ?? (l.length === 1 ? l[0].id : '');
        if (inicial) {
          this.form.patchValue({ turmaId: inicial });
          this.carregarAlunos(inicial);
        }
      }
    });

    if (this.data.falta) {
      const f = this.data.falta;
      const turmaId = f.turmaId ?? f.aluno?.turmaId ?? '';
      this.form.patchValue({
        turmaId,
        alunoId: f.alunoId,
        data: fromISODate(f.data),
        motivo: f.motivo,
      });
      if (turmaId) this.carregarAlunos(turmaId);
    }

    this.form.controls.turmaId.valueChanges.subscribe((id) => {
      this.form.patchValue({ alunoId: '' });
      if (id) this.carregarAlunos(id);
      else this.alunos.set([]);
    });

    this.form.controls.data.valueChanges.subscribe(() => {
      const turmaId = this.form.value.turmaId;
      if (turmaId) {
        this.form.patchValue({ alunoId: '' });
        this.carregarAlunos(turmaId);
      }
    });
  }

  /** Incrementado a cada chamada — descarta respostas de buscas antigas que
   * cheguem fora de ordem (ex.: trocar de turma rápido), evitando misturar
   * alunos de uma turma com a busca de outra. */
  private cargaId = 0;

  private carregarAlunos(turmaId: string): void {
    const idCarga = ++this.cargaId;
    const dataVal = this.form.controls.data.value;
    if (!dataVal) {
      this.alunos.set([]);
      this.carregandoAlunos.set(false);
      return;
    }

    const iso = toISODate(dataVal);
    const fim = () => {
      if (idCarga === this.cargaId) this.carregandoAlunos.set(false);
    };
    this.carregandoAlunos.set(true);
    this.chamadaService.getDia(turmaId, iso).subscribe({
      next: (dia) => {
        const alunos = dia.alunos ?? [];
        fim();
        if (idCarga !== this.cargaId) return;
        const comFalta = new Set(
          dia.registros.filter((r) => r.status === 'F').map((r) => r.alunoId),
        );
        const alunoAtualId = this.data.falta?.alunoId;
        this.alunos.set(alunos.filter((a) => comFalta.has(a.id) || a.id === alunoAtualId));
      },
      error: () => {
        fim();
        if (idCarga !== this.cargaId) return;
        this.alunos.set([]);
      },
    });
  }

  /**
   * Salva daqui mesmo e só fecha com a confirmação da API — se falhar, o
   * diálogo continua aberto com o motivo escrito (ver avaliação).
   */
  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.salvando()) return;

    const v = this.form.getRawValue();
    const dto: FaltaJustificadaCreate = {
      turmaId: v.turmaId,
      alunoId: v.alunoId,
      data: toISODate(v.data!),
      motivo: v.motivo.trim(),
    };
    const existente = this.data.falta;

    this.salvando.set(true);
    this.erro.set(null);
    this.reautenticacao
      .executar(() =>
        existente ? this.service.atualizar(existente.id, dto) : this.service.criar(dto),
      )
      .subscribe({
        next: () => this.ref.close(true),
        error: (err: unknown) => {
          this.salvando.set(false);
          this.erro.set(mensagemErroAoSalvar(err));
        },
      });
  }
}
