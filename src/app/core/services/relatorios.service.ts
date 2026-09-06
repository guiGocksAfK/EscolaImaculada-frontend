import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  RegistroSemestralResponse,
  RelatorioResumo,
} from '../models/relatorio.model';

@Injectable({ providedIn: 'root' })
export class RelatoriosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/relatorios`;

  /** Resumo final por aluno da turma no ano: presenças, faltas, avaliação. */
  resumoPorAluno(turmaId: string, ano: number): Observable<RelatorioResumo> {
    const params = new HttpParams().set('turmaId', turmaId).set('ano', ano);
    return this.http.get<RelatorioResumo>(`${this.base}/resumo`, { params });
  }

  /** Registro de classe do semestre inteiro, já montado e filtrado. */
  registroSemestral(
    turmaId: string,
    ano: number,
    semestre: 1 | 2,
  ): Observable<RegistroSemestralResponse> {
    const params = new HttpParams()
      .set('turmaId', turmaId)
      .set('ano', ano)
      .set('semestre', semestre);
    return this.http.get<RegistroSemestralResponse>(
      `${this.base}/registro-semestral`,
      { params },
    );
  }
}
