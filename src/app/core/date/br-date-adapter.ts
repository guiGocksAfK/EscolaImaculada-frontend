import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * Aceita e exibe datas no formato brasileiro dd/MM/yyyy — o NativeDateAdapter
 * padrão não parseia "15/06/2021" de forma confiável.
 */
@Injectable()
export class BrDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) {
        const dia = +m[1];
        const mes = +m[2] - 1;
        const ano = +m[3];
        const d = new Date(ano, mes, dia);
        return d.getMonth() === mes && d.getDate() === dia ? d : null;
      }
      const t = Date.parse(value);
      return isNaN(t) ? null : new Date(t);
    }
    if (typeof value === 'number') return new Date(value);
    return (value as Date) ?? null;
  }

  override format(date: Date): string {
    const dia = `${date.getDate()}`.padStart(2, '0');
    const mes = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${dia}/${mes}/${date.getFullYear()}`;
  }
}
