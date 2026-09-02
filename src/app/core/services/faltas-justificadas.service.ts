import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  FaltaJustificada,
  FaltaJustificadaCreate,
  FaltasFiltro,
} from '../models/falta-justificada.model';

@Injectable({ providedIn: 'root' })
export class FaltasJustificadasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/faltas-justificadas`;

  listar(filtro: FaltasFiltro = {}): Observable<FaltaJustificada[]> {
    let params = new HttpParams();
    if (filtro.turmaId) params = params.set('turmaId', filtro.turmaId);
    if (filtro.alunoId) params = params.set('alunoId', filtro.alunoId);
    return this.http.get<FaltaJustificada[]>(this.base, { params });
  }

  criar(dto: FaltaJustificadaCreate): Observable<FaltaJustificada> {
    return this.http.post<FaltaJustificada>(this.base, dto);
  }

  atualizar(
    id: string,
    dto: FaltaJustificadaCreate,
  ): Observable<FaltaJustificada> {
    return this.http.put<FaltaJustificada>(`${this.base}/${id}`, dto);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
