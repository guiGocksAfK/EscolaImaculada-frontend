import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ServidorAcordandoOverlay } from './core/servidor/servidor-acordando-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ServidorAcordandoOverlay],
  template: `
    <router-outlet />
    <app-servidor-acordando-overlay />
  `,
})
export class App {}
