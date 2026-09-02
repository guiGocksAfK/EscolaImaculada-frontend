import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Usuario } from '../models/usuario.model';

export type ProfessoraResumo = Pick<Usuario, 'id' | 'nome'>;

@Injectable({ providedIn: 'root' })
export class ProfessorasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/professoras`;

  listar(): Observable<ProfessoraResumo[]> {
    return this.http.get<ProfessoraResumo[]>(this.base);
  }
}
