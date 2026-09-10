import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';

import { routes } from './app.routes';
import { BrDateAdapter } from './core/date/br-date-adapter';
import { authInterceptor } from './core/auth/auth.interceptor';
import { servidorAcordandoInterceptor } from './core/servidor/servidor-acordando.interceptor';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    provideHttpClient(
      // ordem: o de "servidor acordando" é o mais externo (envolve o retry
      // e a contagem de atraso); o de auth só anexa o token.
      withInterceptors([servidorAcordandoInterceptor, authInterceptor]),
    ),
    provideNativeDateAdapter(),
    { provide: DateAdapter, useClass: BrDateAdapter },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      // floatLabel 'always': sem isso, o rótulo de um campo vazio fica
      // centralizado dentro da caixa (parecendo texto já digitado) em vez
      // de subir pro topo — confunde muito em campos maiores, tipo textarea.
      useValue: { appearance: 'outline', floatLabel: 'always' },
    },
  ],
};
