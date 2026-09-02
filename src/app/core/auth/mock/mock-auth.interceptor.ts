import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, dematerialize, materialize, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { LoginRequest, LoginResponse } from '../auth.models';
import { fakeJwt } from './mock-users';
import { mockStore } from './mock-store';

/**
 * Intercepta `POST {apiUrl}/auth/login` e responde com um usuário fake enquanto
 * não há back-end. Só age se `environment.useMock` for true.
 * Remover este arquivo (e o registro em app.config.ts) quando a API real entrar.
 */
export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const isLogin =
    environment.useMock &&
    req.method === 'POST' &&
    req.url === `${environment.apiUrl}/auth/login`;

  if (!isLogin) {
    return next(req);
  }

  const { cpf, senha } = (req.body ?? {}) as Partial<LoginRequest>;
  const somenteDigitos = (cpf ?? '').replace(/\D/g, '');
  const user = mockStore.usuarios
    .all()
    .find((u) => u.cpf === somenteDigitos && u.senha === senha);

  const resposta = user
    ? of(
        new HttpResponse<LoginResponse>({
          status: 200,
          body: { accessToken: fakeJwt(user) },
        }),
      )
    : throwError(() => ({ status: 401, error: { message: 'Credenciais inválidas' } }));

  // delay() simula latência de rede sem quebrar o fluxo de erro
  return resposta.pipe(materialize(), delay(400), dematerialize());
};
