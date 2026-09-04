import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/auth/auth.service';

interface Atalho {
  label: string;
  descricao: string;
  icon: string;
  path: string;
  papeis?: ('DIRETORA' | 'PROFESSORA')[];
}

const ATALHO_PRINCIPAL: Atalho = {
  label: 'Fazer a chamada',
  descricao: 'Marcar a presença do dia — a rotina mais importante',
  icon: 'fact_check',
  path: '/chamada',
};

const ATALHOS: Atalho[] = [
  {
    label: 'Registrar conteúdo',
    descricao: 'O que foi dado na aula',
    icon: 'menu_book',
    path: '/conteudo',
  },
  {
    label: 'Avaliações',
    descricao: 'Relatório descritivo por aluno',
    icon: 'rate_review',
    path: '/avaliacoes',
  },
  {
    label: 'Alunos',
    descricao: 'Cadastro e matrícula',
    icon: 'badge',
    path: '/alunos',
  },
  {
    label: 'Relatórios',
    descricao: 'Resumos e exportação em PDF',
    icon: 'assessment',
    path: '/relatorios',
  },
  {
    label: 'Turmas',
    descricao: 'Organizar as turmas do ano',
    icon: 'groups',
    path: '/turmas',
    papeis: ['DIRETORA'],
  },
  {
    label: 'Professoras',
    descricao: 'Gerenciar o acesso das professoras',
    icon: 'person_add',
    path: '/professoras',
    papeis: ['DIRETORA'],
  },
];

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly auth = inject(AuthService);

  readonly ehDiretora = this.auth.hasPapel('DIRETORA');
  readonly logoOk = signal(true);

  readonly primeiroNome = computed(
    () => this.auth.usuario()?.nome?.split(' ')[0] ?? '',
  );

  readonly saudacao = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  readonly dataHoje = (() => {
    const s = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  readonly principal = ATALHO_PRINCIPAL;

  readonly atalhos = ATALHOS.filter(
    (a) => !a.papeis || (this.ehDiretora && a.papeis.includes('DIRETORA')),
  );
}
