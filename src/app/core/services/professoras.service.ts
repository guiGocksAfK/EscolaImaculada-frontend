import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ProfessoraCreate,
  ProfessoraDetalhe,
  ProfessoraUpdate,
  Usuario,
} from '../models/usuario.model';

export type ProfessoraResumo = Pick<Usuario, 'id' | 'nome'>;

@Injectable({ providedIn: 'root' })
export class ProfessorasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/professoras`;

  /** Lista enxuta para selects (turmas, alunos, avaliações, faltas). */
  listar(): Observable<ProfessoraResumo[]> {
    return this.http.get<ProfessoraResumo[]>(this.base);
  }

  /** Lista completa para a tela de gestão da diretora. */
  listarDetalhado(): Observable<ProfessoraDetalhe[]> {
    return this.http.get<ProfessoraDetalhe[]>(this.base);
  }

  criar(dto: ProfessoraCreate): Observable<ProfessoraDetalhe> {
    return this.http.post<ProfessoraDetalhe>(this.base, dto);
  }

  atualizar(id: string, dto: ProfessoraUpdate): Observable<ProfessoraDetalhe> {
    return this.http.put<ProfessoraDetalhe>(`${this.base}/${id}`, dto);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
