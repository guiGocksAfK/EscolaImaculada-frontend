import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Avaliacao,
  AvaliacaoCreate,
  AvaliacoesFiltro,
} from '../models/avaliacao.model';

@Injectable({ providedIn: 'root' })
export class AvaliacoesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/avaliacoes`;

  listar(filtro: AvaliacoesFiltro = {}): Observable<Avaliacao[]> {
    let params = new HttpParams();
    if (filtro.turmaId) params = params.set('turmaId', filtro.turmaId);
    if (filtro.alunoId) params = params.set('alunoId', filtro.alunoId);
    return this.http.get<Avaliacao[]>(this.base, { params });
  }

  criar(dto: AvaliacaoCreate): Observable<Avaliacao> {
    return this.http.post<Avaliacao>(this.base, dto);
  }

  atualizar(id: string, dto: AvaliacaoCreate): Observable<Avaliacao> {
    return this.http.put<Avaliacao>(`${this.base}/${id}`, dto);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
