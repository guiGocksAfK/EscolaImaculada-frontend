import { Routes } from '@angular/router';

import { authGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'cadastro-inicial',
    loadComponent: () =>
      import('./features/auth/cadastro-inicial/cadastro-inicial').then(
        (m) => m.CadastroInicial,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'turmas',
        loadComponent: () =>
          import('./features/turmas/turmas').then((m) => m.Turmas),
      },
      {
        path: 'alunos',
        loadComponent: () =>
          import('./features/alunos/alunos').then((m) => m.Alunos),
      },
      {
        path: 'chamada',
        loadComponent: () =>
          import('./features/chamada/chamada').then((m) => m.Chamada),
      },
      {
        path: 'conteudo',
        loadComponent: () =>
          import('./features/conteudo/conteudo').then((m) => m.Conteudo),
      },
      {
        path: 'avaliacoes',
        loadComponent: () =>
          import('./features/avaliacoes/avaliacoes').then((m) => m.Avaliacoes),
      },
      {
        // Faltas justificadas agora é uma aba dentro de /chamada.
        path: 'faltas-justificadas',
        redirectTo: 'chamada',
      },
      {
        path: 'relatorios',
        loadComponent: () =>
          import('./features/relatorios/relatorios').then((m) => m.Relatorios),
      },
      {
        path: 'professoras',
        canActivate: [roleGuard('DIRETORA')],
        loadComponent: () =>
          import('./features/professoras/professoras').then(
            (m) => m.Professoras,
          ),
      },
      {
        path: 'escola',
        canActivate: [roleGuard('DIRETORA')],
        loadComponent: () =>
          import('./features/escola/escola').then((m) => m.Escola),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
