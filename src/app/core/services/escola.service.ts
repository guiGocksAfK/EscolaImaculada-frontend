import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Escola, EscolaUpdate } from '../models/escola.model';

@Injectable({ providedIn: 'root' })
export class EscolaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/escola`;

  /**
   * Cache leve pra alimentar o cabeçalho/menu/PDFs sem cada tela ter que
   * buscar de novo — só isso, sem lógica extra: `obter()`/`atualizar()`
   * sempre fazem a chamada de verdade e atualizam o cache com o resultado.
   */
  private readonly _dados = signal<Escola | null>(null);
  readonly dados = this._dados.asReadonly();

  /** Dados da escola do usuário autenticado. */
  obter(): Observable<Escola> {
    return this.http
      .get<Escola>(this.base)
      .pipe(tap((e) => this._dados.set(e)));
  }

  /** Atualiza nome e endereço (somente diretora). */
  atualizar(dto: EscolaUpdate): Observable<Escola> {
    return this.http
      .put<Escola>(this.base, dto)
      .pipe(tap((e) => this._dados.set(e)));
  }
}
