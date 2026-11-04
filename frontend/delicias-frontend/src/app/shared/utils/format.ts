export function formatCurrency(v: number | null | undefined, casas = 2): string {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: casas, maximumFractionDigits: casas,
  });
}

export function formatNumber(v: number, casas = 0): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: casas });
}

/** Date → 'YYYY-MM-DD' no fuso local (toISOString() converte para UTC e pode voltar um dia). */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function formatPct(v: number | null | undefined): string {
  if (v == null) return '';
  const s = v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return v > 0 ? `+${s}%` : `${s}%`;
}

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
