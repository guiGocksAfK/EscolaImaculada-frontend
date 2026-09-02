import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ConteudoFiltro,
  RegistroConteudo,
  RegistroConteudoCreate,
} from '../models/conteudo.model';

@Injectable({ providedIn: 'root' })
export class ConteudoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/conteudo`;

  listar(filtro: ConteudoFiltro = {}): Observable<RegistroConteudo[]> {
    let params = new HttpParams();
    if (filtro.turmaId) params = params.set('turmaId', filtro.turmaId);
    return this.http.get<RegistroConteudo[]>(this.base, { params });
  }

  criar(dto: RegistroConteudoCreate): Observable<RegistroConteudo> {
    return this.http.post<RegistroConteudo>(this.base, dto);
  }

  atualizar(
    id: string,
    dto: RegistroConteudoCreate,
  ): Observable<RegistroConteudo> {
    return this.http.put<RegistroConteudo>(`${this.base}/${id}`, dto);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
