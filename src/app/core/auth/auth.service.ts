import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(this.readToken());

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

  readonly isAuthenticated = computed(() => {
    const claims = this.decode(this._token());
    return !!claims && claims.exp * 1000 > Date.now();
  });

  readonly papel = computed<Papel | null>(() => this.usuario()?.papel ?? null);

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, body)
      .pipe(tap((res) => this.setToken(res.accessToken)));
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
