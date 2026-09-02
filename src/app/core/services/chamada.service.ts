import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChamadaDia, ChamadaMensal } from '../models/chamada.model';

@Injectable({ providedIn: 'root' })
export class ChamadaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/chamada`;

  /** Registros de um dia para a turma (vazio se ainda não lançada). */
  getDia(turmaId: string, data: string): Observable<ChamadaDia> {
    const params = new HttpParams().set('turmaId', turmaId).set('data', data);
    return this.http.get<ChamadaDia>(this.base, { params });
  }

  /** Salva (upsert) a chamada do dia inteira. */
  salvarDia(dia: ChamadaDia): Observable<ChamadaDia> {
    return this.http.put<ChamadaDia>(this.base, dia);
  }

  getMes(turmaId: string, ano: number, mes: number): Observable<ChamadaMensal> {
    const params = new HttpParams()
      .set('turmaId', turmaId)
      .set('ano', ano)
      .set('mes', mes);
    return this.http.get<ChamadaMensal>(`${this.base}/mensal`, { params });
  }
}
