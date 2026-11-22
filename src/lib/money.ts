const fmtPHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });
const fmtPHP0 = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export function peso(n: number, whole = false): string {
  return (whole ? fmtPHP0 : fmtPHP).format(n);
}

export interface Period {
  kind: 'month' | 'year';
  year: number;
  month: number; // 1-12, ignored for year
}

export function periodRange(p: Period): [string, string] {
  if (p.kind === 'year') return [`${p.year}-01-01`, `${p.year}-12-31`];
  const m = String(p.month).padStart(2, '0');
  const last = new Date(p.year, p.month, 0).getDate();
  return [`${p.year}-${m}-01`, `${p.year}-${m}-${String(last).padStart(2, '0')}`];
}

export function shiftPeriod(p: Period, dir: 1 | -1): Period {
  if (p.kind === 'year') return { ...p, year: p.year + dir };
  let month = p.month + dir, year = p.year;
  if (month < 1) { month = 12; year--; }
  if (month > 12) { month = 1; year++; }
  return { ...p, month, year };
}

export function periodLabel(p: Period): string {
  if (p.kind === 'year') return String(p.year);
  return new Date(p.year, p.month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

export interface TxLike { type: 'expense' | 'income'; category: string; amount: number; qty?: number; unit?: string }

export function summarize(txs: TxLike[]) {
  let expense = 0, income = 0;
  const byCat = new Map<string, number>();
  let feedKg = 0, feedKgCost = 0;
  for (const t of txs) {
    if (t.type === 'income') { income += t.amount; continue; }
    expense += t.amount;
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    if (t.category === 'Feed' && t.qty && t.unit === 'kg') { feedKg += t.qty; feedKgCost += t.amount; }
  }
  const categories = [...byCat.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  return { expense, income, net: income - expense, categories, feedKg, pricePerKg: feedKg ? feedKgCost / feedKg : null };
}
