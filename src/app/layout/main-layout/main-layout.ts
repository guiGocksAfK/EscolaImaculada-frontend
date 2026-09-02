import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/auth/auth.service';
import { Papel } from '../../core/models/usuario.model';

interface NavItem {
  label: string;
  icon: string; // Material icon name
  path: string;
  papeis?: Papel[]; // se ausente, visível para todos
}

const NAV: NavItem[] = [
  { label: 'Início', icon: 'home', path: '/inicio' },
  { label: 'Turmas', icon: 'groups', path: '/turmas' },
  { label: 'Alunos', icon: 'badge', path: '/alunos' },
  { label: 'Chamada', icon: 'fact_check', path: '/chamada' },
  { label: 'Conteúdo', icon: 'menu_book', path: '/conteudo' },
  { label: 'Avaliações', icon: 'rate_review', path: '/avaliacoes' },
  {
    label: 'Faltas justificadas',
    icon: 'event_busy',
    path: '/faltas-justificadas',
  },
  { label: 'Relatórios', icon: 'assessment', path: '/relatorios' },
  {
    label: 'Professoras',
    icon: 'person_add',
    path: '/professoras',
    papeis: ['DIRETORA'],
  },
  {
    label: 'Escola',
    icon: 'apartment',
    path: '/escola',
    papeis: ['DIRETORA'],
  },
];

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly auth = inject(AuthService);

  readonly usuario = this.auth.usuario;

  readonly itens = computed(() => {
    const papel = this.auth.papel();
    return NAV.filter((i) => !i.papeis || (papel && i.papeis.includes(papel)));
  });

  sair(): void {
    this.auth.logout();
  }
}
