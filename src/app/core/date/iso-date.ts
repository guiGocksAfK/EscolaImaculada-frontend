/** Date -> "YYYY-MM-DD" no horário local (sem UTC shift). */
export function toISODate(d: Date): string {
  const mes = `${d.getMonth() + 1}`.padStart(2, '0');
  const dia = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "YYYY-MM-DD" -> Date local (meia-noite). Retorna null se inválida. */
export function fromISODate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}
