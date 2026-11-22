import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db, type Bird } from './db';
import { makeKinship } from './lib/pedigree';
import { addDays, today } from './lib/dates';

export function useBirds() {
  const birds = useLiveQuery(() => db.birds.toArray(), []);
  const map = useMemo(() => new Map((birds ?? []).map((b) => [b.id, b])), [birds]);
  return { birds, map, loading: birds === undefined };
}

export function useKinship(map: Map<number, Bird>) {
  return useMemo(() => makeKinship((id) => map.get(id)), [map]);
}

export interface DueItem {
  bird: Bird;
  protocolId: number;
  name: string;
  route?: string;
  due: string;
  dueEnd: string;
  overdue: boolean;
}

/** Vaccination items due for active birds within `horizon` days (and anything overdue up to 60 days). */
export function useDueHealth(horizon = 14) {
  return useLiveQuery(async () => {
    const [birds, protocol, events] = await Promise.all([
      db.birds.where('status').equals('active').toArray(),
      db.protocol.orderBy('dayFrom').toArray(),
      db.health.toArray(),
    ]);
    const done = new Set(events.filter((e) => e.protocolId != null).map((e) => `${e.birdId}:${e.protocolId}`));
    const t = today();
    const limit = addDays(t, horizon);
    const oldest = addDays(t, -60);
    const out: DueItem[] = [];
    for (const b of birds) {
      if (!b.hatchDate) continue;
      for (const p of protocol) {
        if (done.has(`${b.id}:${p.id}`)) continue;
        const due = addDays(b.hatchDate, p.dayFrom);
        const dueEnd = addDays(b.hatchDate, p.dayTo);
        if (due > limit || dueEnd < oldest) continue;
        out.push({ bird: b, protocolId: p.id, name: p.name, route: p.route, due, dueEnd, overdue: dueEnd < t });
      }
    }
    return out.sort((a, b) => a.due.localeCompare(b.due));
  }, [horizon]);
}
