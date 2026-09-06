import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

import { ResumoAnual } from './resumo-anual/resumo-anual';
import { ExportChamada } from './export-chamada/export-chamada';
import { RegistroSemestral } from './registro-semestral/registro-semestral';

@Component({
  selector: 'app-relatorios',
  imports: [MatTabsModule, ResumoAnual, ExportChamada, RegistroSemestral],
  template: `
    <h1>Relatórios</h1>
    <mat-tab-group>
      <mat-tab label="Resumo por aluno">
        <app-resumo-anual />
      </mat-tab>
      <mat-tab label="Chamada mensal (PDF)">
        <app-export-chamada />
      </mat-tab>
      <mat-tab label="Registro de classe (semestral)">
        <app-registro-semestral />
      </mat-tab>
    </mat-tab-group>
  `,
  styles: `
    h1 {
      margin: 0 0 0.75rem;
    }
    :host ::ng-deep .mat-mdc-tab-body-content {
      padding: 1.25rem 0.25rem;
    }
  `,
})
export class Relatorios {}
