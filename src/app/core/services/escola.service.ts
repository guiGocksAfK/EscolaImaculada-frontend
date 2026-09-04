import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Escola, EscolaUpdate } from '../models/escola.model';

@Injectable({ providedIn: 'root' })
export class EscolaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/escola`;

  /** Dados da escola do usuário autenticado. */
  obter(): Observable<Escola> {
    return this.http.get<Escola>(this.base);
  }

  /** Atualiza nome e endereço (somente diretora). */
  atualizar(dto: EscolaUpdate): Observable<Escola> {
    return this.http.put<Escola>(this.base, dto);
  }
}
