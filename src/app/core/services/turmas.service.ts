import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Turma, TurmaCreate } from '../models/turma.model';

@Injectable({ providedIn: 'root' })
export class TurmasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/turmas`;

  /** Lista escopada pelo back-end conforme o papel (diretora: todas). */
  listar(): Observable<Turma[]> {
    return this.http.get<Turma[]>(this.base);
  }

  criar(dto: TurmaCreate): Observable<Turma> {
    return this.http.post<Turma>(this.base, dto);
  }

  atualizar(id: string, dto: TurmaCreate): Observable<Turma> {
    return this.http.put<Turma>(`${this.base}/${id}`, dto);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
