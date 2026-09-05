import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule, MatChipListboxChange } from '@angular/material/chips';

import { TurmasService } from '../../../core/services/turmas.service';
import { Turma } from '../../../core/models/turma.model';
import {
  RegistroConteudo,
  RegistroConteudoCreate,
} from '../../../core/models/conteudo.model';
import { fromISODate, toISODate } from '../../../core/date/iso-date';
import {
  CAMPOS_EXPERIENCIA,
  ChaveCampoExperiencia,
  camposPreenchidos,
  camposVazios,
  parseConteudo,
  serializarConteudo,
} from '../campos-conteudo';

export interface ConteudoFormData {
  registro?: RegistroConteudo;
  turmaIdInicial?: string;
  dataInicial?: string;
}

export type ConteudoFormResult = RegistroConteudoCreate;

/** Exige que pelo menos um dos campos de conteúdo tenha texto. */
const pelosMenosUmCampo: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const v = group.value as Record<string, string>;
  const preenchido =
    !!v['outras']?.trim() ||
    CAMPOS_EXPERIENCIA.some((c) => !!v[c.chave]?.trim());
  return preenchido ? null : { vazio: true };
};

@Component({
  selector: 'app-conteudo-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatChipsModule,
  ],
  templateUrl: './conteudo-form-dialog.html',
  styleUrl: './conteudo-form-dialog.scss',
})
export class ConteudoFormDialog implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly turmasService = inject(TurmasService);
  private readonly ref = inject(
    MatDialogRef<ConteudoFormDialog, ConteudoFormResult>,
  );
  private readonly data = inject<ConteudoFormData>(MAT_DIALOG_DATA);

  readonly turmas = signal<Turma[]>([]);
  readonly edicao = !!this.data.registro;
  readonly campos = CAMPOS_EXPERIENCIA;

  /** Já tem turma definida (veio da tela de origem) — trava o campo pra não confundir. */
  readonly turmaFixa = !!(this.data.registro ?? this.data.turmaIdInicial);

  /** Campos de experiência marcados como trabalhados — só esses mostram textarea. */
  readonly selecionados = signal<ChaveCampoExperiencia[]>([]);

  readonly form = this.fb.group(
    {
      turmaId: ['', [Validators.required]],
      data: this.fb.control<Date | null>(
        fromISODate(this.data.dataInicial) ?? new Date(),
        { validators: [Validators.required] },
      ),
      disciplina: [''],
      euOutroNos: [''],
      corpoGestos: [''],
      tracosSons: [''],
      escutaFala: [''],
      espacoTempo: [''],
      outras: [''],
    },
    { validators: pelosMenosUmCampo },
  );

  ngOnInit(): void {
    this.turmasService.listar().subscribe((l) => {
      this.turmas.set(l);
      if (!this.edicao && !this.form.value.turmaId) {
        const inicial =
          this.data.turmaIdInicial || (l.length === 1 ? l[0].id : '');
        if (inicial) this.form.patchValue({ turmaId: inicial });
      }
    });

    if (this.data.registro) {
      const r = this.data.registro;
      const camposDoRegistro = parseConteudo(r.conteudo);
      this.form.patchValue({
        turmaId: r.turmaId,
        data: fromISODate(r.data),
        ...camposDoRegistro,
      });
      this.selecionados.set(
        CAMPOS_EXPERIENCIA.filter((c) => camposDoRegistro[c.chave].trim())
          .map((c) => c.chave),
      );
    }

    if (this.turmaFixa) this.form.controls.turmaId.disable();
  }

  get turmaNomeFixa(): string {
    return (
      this.turmas().find((t) => t.id === this.form.controls.turmaId.value)
        ?.nome ?? '…'
    );
  }

  onSelecaoChange(evento: MatChipListboxChange): void {
    const novasChaves = evento.value as ChaveCampoExperiencia[];
    for (const campo of CAMPOS_EXPERIENCIA) {
      if (!novasChaves.includes(campo.chave)) {
        this.form.controls[campo.chave].setValue('');
      }
    }
    this.selecionados.set(novasChaves);
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const campos = { ...camposVazios(), ...v };
    if (!camposPreenchidos(campos)) {
      this.form.markAllAsTouched();
      return;
    }
    this.ref.close({
      turmaId: v.turmaId,
      data: toISODate(v.data!),
      conteudo: serializarConteudo(campos),
    });
  }
}
