import { Papel } from '../models/usuario.model';

export interface LoginRequest {
  cpf: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
}

/** Claims esperadas no JWT emitido pelo back-end. */
export interface JwtClaims {
  sub: string; // usuario id
  nome: string;
  papel: Papel;
  escolaId: string;
  exp: number; // epoch seconds
  iat: number;
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  papel: Papel;
  escolaId: string;
}
