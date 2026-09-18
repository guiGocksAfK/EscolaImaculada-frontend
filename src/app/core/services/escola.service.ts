import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Escola, ResumoEscola } from '../models/escola.model';

/**
 * Nome e endereço são definidos no cadastro inicial. A diretora pode editar
 * depois (tela de Professoras) e também excluir a escola inteira — essa
 * última exige a senha dela de novo.
 */
@Injectable({ providedIn: 'root' })
export class EscolaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/escola`;

  /** Cache leve pra alimentar o cabeçalho/menu/PDFs sem repetir a chamada. */
  private readonly _dados = signal<Escola | null>(null);

  /**
   * O cache só vale para a escola da sessão atual. Sem essa amarra, sair e
   * entrar com uma conta de OUTRA escola (sem recarregar a página)
   * reaproveitava o nome anterior — inclusive no cabeçalho dos PDFs. Com ela,
   * o cache de outra escola lê como vazio, e o layout busca o certo.
   */
  readonly dados = computed(() => {
    const d = this._dados();
    return d && d.id === this.auth.usuario()?.escolaId ? d : null;
  });

  /** Nome da escola para a tela de login (endpoint público, sem token). */
  private readonly _nomePublico = signal<string | null>(null);
  readonly nomePublico = this._nomePublico.asReadonly();

  /** Dados da escola do usuário autenticado. */
  obter(): Observable<Escola> {
    return this.http.get<Escola>(this.base).pipe(
      tap((e) => {
        this._dados.set(e);
        this._nomePublico.set(e.nome);
      }),
    );
  }

  /** Totais gerais da escola (alunos, professoras, turmas). */
  resumo(): Observable<ResumoEscola> {
    return this.http.get<ResumoEscola>(`${this.base}/resumo`);
  }

  /** Atualiza nome e endereço (só DIRETORA). */
  atualizar(dados: { nome: string; endereco: string }): Observable<Escola> {
    return this.http.put<Escola>(this.base, dados).pipe(
      tap((e) => {
        this._dados.set(e);
        this._nomePublico.set(e.nome);
      }),
    );
  }

  /**
   * Apaga a escola e todo o histórico. Exige a senha da diretora de novo.
   * Depois disso o token não vale mais nada — quem chamar deve fazer logout.
   */
  excluir(senha: string): Observable<void> {
    return this.http.delete<void>(this.base, { body: { senha } });
  }

  /**
   * Busca só o nome da escola, sem autenticação — para a tela de login.
   * Falha em silêncio (a tela cai no nome padrão do environment).
   */
  carregarNomePublico(): void {
    this.http.get<{ nome: string | null }>(`${this.base}/publica`).subscribe({
      next: (r) => {
        if (r.nome) this._nomePublico.set(r.nome);
      },
      error: () => {
        /* mantém o nome padrão */
      },
    });
  }
}
