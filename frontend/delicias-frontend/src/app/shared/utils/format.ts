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
