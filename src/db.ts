import Dexie, { type EntityTable } from 'dexie';

export type Sex = 'M' | 'F' | 'U';
export type BirdStatus = 'active' | 'sold' | 'dead' | 'culled';

export interface Bird {
  id: number;
  band: string;
  name?: string;
  sex: Sex;
  bloodline?: string;
  color?: string;
  hatchDate?: string; // YYYY-MM-DD
  sireId?: number;
  damId?: number;
  status: BirdStatus;
  notes?: string;
  photo?: string; // small JPEG data URL
  batchId?: number;
  /** Breeder's own quality score, 1 (poor) – 5 (excellent). Drives nick analysis. */
  rating?: number;
  createdAt: number;
}

export interface Batch {
  id: number;
  label: string;
  sireId?: number;
  damId?: number;
  method: 'incubator' | 'hen';
  setDate: string;
  eggsSet: number;
  fertile?: number;
  hatched?: number;
  notes?: string;
  closed?: boolean;
  createdAt: number;
}

export interface ProtocolItem {
  id: number;
  name: string;
  dayFrom: number; // age in days
  dayTo: number;
  route?: string;
  notes?: string;
  source?: string;
}

export type HealthKind = 'vaccine' | 'deworm' | 'treatment' | 'vitamins' | 'other';

export interface HealthEvent {
  id: number;
  birdId: number;
  date: string;
  kind: HealthKind;
  product: string;
  notes?: string;
  protocolId?: number;
}

export type TxType = 'expense' | 'income';

export const EXPENSE_CATEGORIES = [
  'Feed', 'Vitamins & supplements', 'Vaccines & medicine', 'Equipment & housing', 'Labor', 'Electricity & water',
  'Birds purchased', 'Transport', 'Other',
] as const;
export const INCOME_CATEGORIES = ['Bird sale', 'Eggs', 'Stud service', 'Other'] as const;

export interface Transaction {
  id: number;
  type: TxType;
  date: string;
  category: string;
  amount: number; // PHP
  description?: string;
  qty?: number;
  unit?: string; // kg, sack, bottle, pc
  birdId?: number;
  createdAt: number;
}

export const db = new Dexie('breeders-assistant') as Dexie & {
  birds: EntityTable<Bird, 'id'>;
  batches: EntityTable<Batch, 'id'>;
  protocol: EntityTable<ProtocolItem, 'id'>;
  health: EntityTable<HealthEvent, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
};

db.version(1).stores({
  birds: '++id, band, sex, bloodline, status, sireId, damId, batchId',
  batches: '++id, setDate, closed',
  protocol: '++id, dayFrom',
  health: '++id, birdId, date, protocolId',
});

const BAI = 'BAI Newcastle Disease vaccination program for game fowls (verify the current version with BAI or your vet)';

export const DEFAULT_PROTOCOL: Omit<ProtocolItem, 'id'>[] = [
  { name: 'Newcastle (ND) live B1 / apathogenic strain', dayFrom: 3, dayTo: 7, route: 'Eye or nose drop', source: BAI,
    notes: 'High-risk areas: give on day 1–3 instead.' },
  { name: 'Newcastle (ND) live La Sota', dayFrom: 14, dayTo: 17, route: 'Eye/nose drop or drinking water', source: BAI,
    notes: 'High-risk areas: day 10–14.' },
  { name: 'Newcastle (ND) killed La Sota', dayFrom: 28, dayTo: 28, route: 'Intramuscular injection', source: BAI,
    notes: 'May be optional if a recombinant ND vaccine was given at day 1.' },
];

db.version(2).stores({
  transactions: '++id, date, type, category, birdId, createdAt',
});

db.on('populate', (tx) => {
  tx.table('protocol').bulkAdd(DEFAULT_PROTOCOL);
});

export function birdLabel(b?: Bird | null): string {
  if (!b) return '—';
  return b.name ? `${b.band} · ${b.name}` : b.band;
}
