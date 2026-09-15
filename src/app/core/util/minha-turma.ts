import { Turma } from '../models/turma.model';

/**
 * Turma da qual o usuário logado é a responsável — vale tanto para uma
 * professora comum quanto para uma diretora que também leciona uma turma.
 *
 * Devolve `null` quando ele não é responsável por nenhuma turma (dentre as
 * visíveis) ou por mais de uma — nesse último caso não há uma turma "óbvia"
 * pra virar padrão sozinha.
 */
export function minhaTurmaId(
  turmas: Turma[],
  meuId: string | undefined,
): string | null {
  if (!meuId) return null;
  const minhas = turmas.filter((t) => t.professoraId === meuId);
  return minhas.length === 1 ? minhas[0].id : null;
}
