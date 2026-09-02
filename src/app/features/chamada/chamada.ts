import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

import { ChamadaDia } from './chamada-dia/chamada-dia';
import { ChamadaMensal } from './chamada-mensal/chamada-mensal';
import { Faltas } from './faltas/faltas';

@Component({
  selector: 'app-chamada',
  imports: [MatTabsModule, ChamadaDia, ChamadaMensal, Faltas],
  template: `
    <h1>Chamada</h1>

    <mat-tab-group>
      <mat-tab label="Chamada do dia">
        <app-chamada-dia />
      </mat-tab>
      <mat-tab label="Visão mensal">
        <app-chamada-mensal />
      </mat-tab>
      <mat-tab label="Faltas justificadas">
        <app-faltas />
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
export class Chamada {}
