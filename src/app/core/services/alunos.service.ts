import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Aluno,
  AlunoCreate,
  AlunosFiltro,
  AlunoUpdate,
  StatusAluno,
} from '../models/aluno.model';

@Injectable({ providedIn: 'root' })
export class AlunosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/alunos`;

  /** Lista escopada pelo papel no back-end (professora: só suas turmas). */
  listar(filtro: AlunosFiltro = {}): Observable<Aluno[]> {
    let params = new HttpParams();
    if (filtro.turmaId) params = params.set('turmaId', filtro.turmaId);
    if (filtro.status) params = params.set('status', filtro.status);
    return this.http.get<Aluno[]>(this.base, { params });
  }

  criar(dto: AlunoCreate): Observable<Aluno> {
    return this.http.post<Aluno>(this.base, dto);
  }

  atualizar(id: string, dto: AlunoUpdate): Observable<Aluno> {
    return this.http.put<Aluno>(`${this.base}/${id}`, dto);
  }

  alterarStatus(id: string, status: StatusAluno): Observable<Aluno> {
    return this.http.patch<Aluno>(`${this.base}/${id}/status`, { status });
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
