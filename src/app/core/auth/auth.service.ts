import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map, take, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import { environment } from '../../../environments/environment';
import {
  JwtClaims,
  LoginRequest,
  LoginResponse,
  UsuarioAutenticado,
} from './auth.models';
import { CadastroInicial, Papel } from '../models/usuario.model';

const TOKEN_KEY = 'ei.token';

/** Maior atraso que o setTimeout aceita (~24,8 dias); acima disso ele dispara na hora. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/** A reautenticação foi feita com outra conta — ver `reautenticar()`. */
export class ContaDiferenteError extends Error {
  constructor() {
    super('Login feito com uma conta diferente da que estava em uso.');
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private readonly _token = signal<string | null>(this.readToken());
  private timerExpiracao: ReturnType<typeof setTimeout> | undefined;

  readonly token = this._token.asReadonly();

  readonly usuario = computed<UsuarioAutenticado | null>(() => {
    const claims = this.decode(this._token());
    if (!claims) return null;
    return {
      id: claims.sub,
      nome: claims.nome,
      papel: claims.papel,
      escolaId: claims.escolaId,
    };
  });

  readonly papel = computed<Papel | null>(() => this.usuario()?.papel ?? null);

  constructor() {
    // Encerra a sessão quando o token vence, em vez de deixar a tela aberta
    // com dados da escola até alguém clicar em algo. Reagenda a cada troca de
    // token (login, reautenticação, logout).
    effect(() => this.agendarExpiracao(this.decode(this._token())));
  }

  /**
   * A sessão vale AGORA? Método, e não `computed`, de propósito: um `computed`
   * guarda o resultado até o token mudar, e a passagem do tempo não é um sinal
   * — calculado uma vez como válido, ele continuava `true` depois de vencer.
   */
  sessaoValida(): boolean {
    const claims = this.decode(this._token());
    return !!claims && claims.exp * 1000 > Date.now();
  }

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, body)
      .pipe(tap((res) => this.setToken(res.accessToken)));
  }

  /**
   * Login no meio do trabalho, depois que a sessão expirou (ver
   * ReautenticacaoService). Só aceita a MESMA conta que estava em uso: o
   * formulário aberto e os dados na tela são dela, e o salvamento vai ser
   * refeito logo em seguida — com outra conta, ele seria gravado (e auditado)
   * em nome de quem não escreveu.
   */
  reautenticar(body: LoginRequest): Observable<void> {
    const esperado = this.usuario()?.id;
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, body)
      .pipe(
        map((res) => {
          const claims = this.decode(res.accessToken);
          if (!claims || (esperado && claims.sub !== esperado)) {
            throw new ContaDiferenteError();
          }
          this.setToken(res.accessToken);
        }),
      );
  }

  /** Bootstrap: cria a escola + a conta da diretora e já autentica. */
  cadastroInicial(body: CadastroInicial): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/cadastro-inicial`, body)
      .pipe(tap((res) => this.setToken(res.accessToken)));
  }

  logout(redirect = true): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    if (redirect) this.router.navigate(['/login']);
  }

  hasPapel(...papeis: Papel[]): boolean {
    const atual = this.papel();
    return !!atual && papeis.includes(atual);
  }

  private agendarExpiracao(claims: JwtClaims | null): void {
    clearTimeout(this.timerExpiracao);
    if (!claims) return;
    const falta = claims.exp * 1000 - Date.now();
    // Acima do teto do setTimeout, agenda uma reavaliação no teto em vez do
    // vencimento — senão o timer dispararia imediatamente e deslogaria à toa.
    this.timerExpiracao = setTimeout(
      () => this.aoVencer(),
      Math.max(0, Math.min(falta, MAX_TIMEOUT_MS)),
    );
  }

  private aoVencer(): void {
    if (!this._token()) return;
    if (this.sessaoValida()) {
      this.agendarExpiracao(this.decode(this._token()));
      return;
    }
    // Formulário aberto: não derruba. Deslogar navega para /login, e navegar
    // fecha os diálogos — levando junto o que estava sendo digitado. O
    // salvamento cai no 401, a pessoa entra de novo sem fechar nada
    // (ReautenticacaoService), e só se ela desistir e fechar tudo é que a
    // sessão termina aqui.
    if (this.dialog.openDialogs.length > 0) {
      this.dialog.afterAllClosed.pipe(take(1)).subscribe(() => {
        if (!this.sessaoValida()) this.logout();
      });
      return;
    }
    this.logout();
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  private readToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private decode(token: string | null): JwtClaims | null {
    if (!token) return null;
    try {
      return jwtDecode<JwtClaims>(token);
    } catch {
      return null;
    }
  }
}
