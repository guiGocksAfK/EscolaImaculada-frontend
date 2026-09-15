import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/auth/auth.service';
import { EscolaService } from '../../core/services/escola.service';
import { TurmasService } from '../../core/services/turmas.service';
import { minhaTurmaId } from '../../core/util/minha-turma';

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
  private readonly escolaService = inject(EscolaService);
  private readonly turmasService = inject(TurmasService);

  readonly ehDiretora = this.auth.hasPapel('DIRETORA');
  readonly logoOk = signal(true);

  /** Nome da turma da qual a diretora também é a responsável, se houver. */
  readonly nomeMinhaTurma = signal<string | null>(null);

  constructor() {
    // Só interessa mostrar pra diretora: pra uma professora comum, o
    // dashboard inteiro já é sobre a turma dela.
    if (this.ehDiretora) {
      this.turmasService.listar().subscribe((l) => {
        const id = minhaTurmaId(l, this.auth.usuario()?.id);
        this.nomeMinhaTurma.set(l.find((t) => t.id === id)?.nome ?? null);
      });
    }
  }

  readonly nomeEscola = computed(
    () => this.escolaService.dados()?.nome ?? '',
  );

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
