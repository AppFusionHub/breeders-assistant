import type { Transaction } from '../db';

export interface ItemPrice {
  key: string;
  label: string;
  category: string;
  unit?: string;
  last: { date: string; amount: number; unitPrice?: number };
  prev?: { date: string; unitPrice?: number; amount: number };
  count: number;
  trend: 'up' | 'down' | 'same' | null; // last vs previous unit price (or amount if no qty)
}

export interface SupplierStats {
  total: number;
  count: number;
  lastDate?: string;
  feedPerKg: number | null;
  items: ItemPrice[];
}

const unitPrice = (t: Pick<Transaction, 'amount' | 'qty'>) => (t.qty && t.qty > 0 ? t.amount / t.qty : undefined);

/** Spending summary and per-item price history for one supplier's expense entries. */
export function supplierStats(txs: Transaction[]): SupplierStats {
  const exp = txs.filter((t) => t.type === 'expense').sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  let total = 0, kg = 0, kgCost = 0;
  const groups = new Map<string, Transaction[]>();
  for (const t of exp) {
    total += t.amount;
    if (t.category === 'Feed' && t.unit === 'kg' && t.qty) { kg += t.qty; kgCost += t.amount; }
    const label = t.description?.trim() || t.category;
    const key = `${t.category}|${label.toLowerCase()}|${t.unit ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const items: ItemPrice[] = [...groups.entries()].map(([key, g]) => {
    const last = g[g.length - 1], prev = g.length > 1 ? g[g.length - 2] : undefined;
    const lv = unitPrice(last) ?? last.amount, pv = prev ? unitPrice(prev) ?? prev.amount : undefined;
    const trend: ItemPrice['trend'] = pv == null ? null : Math.abs(lv - pv) < 0.005 ? 'same' : lv > pv ? 'up' : 'down';
    return {
      key, label: last.description?.trim() || last.category, category: last.category, unit: last.unit,
      last: { date: last.date, amount: last.amount, unitPrice: unitPrice(last) },
      prev: prev && { date: prev.date, amount: prev.amount, unitPrice: unitPrice(prev) },
      count: g.length, trend,
    };
  }).sort((a, b) => b.last.date.localeCompare(a.last.date));
  return { total, count: exp.length, lastDate: exp[exp.length - 1]?.date, feedPerKg: kg ? kgCost / kg : null, items };
}

export function telLink(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
export function smsLink(phone: string) {
  return `sms:${phone.replace(/[^\d+]/g, '')}`;
}
