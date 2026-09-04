import { WritableSignal } from '@angular/core';

/**
 * Só marca `carregando` como `true` se a operação passar de `atrasoMs`.
 * Devolve uma função para chamar quando a operação terminar (sucesso ou erro).
 *
 * Evita o "flash" da barra de progresso em cargas rápidas — ela só aparece
 * quando a espera é longa o suficiente para o usuário perceber.
 */
export function iniciarCarregamento(
  carregando: WritableSignal<boolean>,
  atrasoMs = 500,
): () => void {
  const timer = setTimeout(() => carregando.set(true), atrasoMs);
  return () => {
    clearTimeout(timer);
    carregando.set(false);
  };
}
