import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';

import { AuthService } from '../../core/auth/auth.service';
import { EscolaService } from '../../core/services/escola.service';
import { Papel } from '../../core/models/usuario.model';

interface NavItem {
  label: string;
  icon: string; // Material icon name
  path: string;
  papeis?: Papel[]; // se ausente, visível para todos
}

interface NavGroup {
  label?: string; // sem rótulo = grupo "solto" no topo (ex.: Início)
  itens: NavItem[];
}

const NAV_GRUPOS: NavGroup[] = [
  { itens: [{ label: 'Início', icon: 'home', path: '/inicio' }] },
  {
    label: 'Diário',
    itens: [
      { label: 'Chamada', icon: 'fact_check', path: '/chamada' },
      { label: 'Conteúdo', icon: 'menu_book', path: '/conteudo' },
      { label: 'Avaliações', icon: 'rate_review', path: '/avaliacoes' },
    ],
  },
  {
    label: 'Gestão',
    itens: [
      { label: 'Turmas', icon: 'groups', path: '/turmas' },
      { label: 'Alunos', icon: 'badge', path: '/alunos' },
      { label: 'Relatórios', icon: 'assessment', path: '/relatorios' },
    ],
  },
  {
    label: 'Administração',
    itens: [
      {
        label: 'Professoras',
        icon: 'person_add',
        path: '/professoras',
        papeis: ['DIRETORA'],
      },
    ],
  },
];

/** Abaixo disso o menu vira gaveta (hambúrguer) em vez de barra fixa. */
const BREAKPOINT_MOBILE = '(max-width: 768px)';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly escolaService = inject(EscolaService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly usuario = this.auth.usuario;

  readonly isMobile = toSignal(
    this.breakpointObserver
      .observe(BREAKPOINT_MOBILE)
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly nomeEscola = computed(
    () => this.escolaService.dados()?.nome ?? 'Escola',
  );

  readonly grupos = computed(() => {
    const papel = this.auth.papel();
    return NAV_GRUPOS.map((g) => ({
      ...g,
      itens: g.itens.filter(
        (i) => !i.papeis || (papel && i.papeis.includes(papel)),
      ),
    })).filter((g) => g.itens.length > 0);
  });

  constructor() {
    if (!this.escolaService.dados()) this.escolaService.obter().subscribe();
  }

  iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/);
    const primeira = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }

  fecharSeMobile(drawer: MatSidenav): void {
    if (this.isMobile()) drawer.close();
  }

  sair(): void {
    this.auth.logout();
  }
}
