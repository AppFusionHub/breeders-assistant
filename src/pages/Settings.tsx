import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Card } from '../components';
import { today } from '../lib/dates';

const BACKUP_VERSION = 1;

export default function Settings() {
  const counts = useLiveQuery(async () => ({
    birds: await db.birds.count(), batches: await db.batches.count(), health: await db.health.count(),
    transactions: await db.transactions.count(),
  }), []);
  const [msg, setMsg] = useState('');

  async function exportData() {
    const data = {
      app: 'breeders-assistant', version: BACKUP_VERSION, exportedAt: new Date().toISOString(),
      birds: await db.birds.toArray(), batches: await db.batches.toArray(),
      protocol: await db.protocol.toArray(), health: await db.health.toArray(),
      transactions: await db.transactions.toArray(),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const file = new File([blob], `breeders-backup-${today()}.json`, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Breeder's Assistant backup" }); return; } catch { /* fall back to download */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importData(f?: File) {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== 'breeders-assistant' || !Array.isArray(data.birds)) throw new Error('Not a Breeder\'s Assistant backup file.');
      if (!confirm(`Replace ALL current data with this backup (${data.birds.length} birds)?`)) return;
      await db.transaction('rw', [db.birds, db.batches, db.protocol, db.health, db.transactions], async () => {
        await Promise.all([db.birds.clear(), db.batches.clear(), db.protocol.clear(), db.health.clear(), db.transactions.clear()]);
        await db.birds.bulkAdd(data.birds);
        await db.batches.bulkAdd(data.batches ?? []);
        await db.protocol.bulkAdd(data.protocol ?? []);
        await db.health.bulkAdd(data.health ?? []);
        await db.transactions.bulkAdd(data.transactions ?? []);
      });
      setMsg(`Restored ${data.birds.length} birds.`);
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  }

  async function wipe() {
    if (!confirm('Delete ALL data on this device? Export a backup first.')) return;
    if (!confirm('Are you sure? This cannot be undone.')) return;
    await db.delete();
    location.reload();
  }

  return (
    <div className="stack">
      <h1>Settings</h1>
      <Card>
        <h2>Your data</h2>
        <p className="small">{counts?.birds ?? 0} birds · {counts?.batches ?? 0} batches · {counts?.health ?? 0} health records · {counts?.transactions ?? 0} cost entries</p>
        <p className="small muted">Everything is stored only on this device, with no account or internet needed. Uninstalling the app or clearing browser data deletes it, so export a backup regularly and keep it in Google Drive, Messenger or email.</p>
        <div className="actions">
          <button className="btn primary" onClick={exportData}>Export backup</button>
          <label className="btn">Import backup<input type="file" accept="application/json,.json" hidden onChange={(e) => importData(e.target.files?.[0])} /></label>
        </div>
        {msg && <p className="small">{msg}</p>}
      </Card>
      <Card>
        <h2>Install on your phone</h2>
        <p className="small">Android (Chrome): menu ⋮ → <b>Add to Home screen</b> / <b>Install app</b>. iPhone (Safari): Share → <b>Add to Home Screen</b>. After the first load it works offline.</p>
      </Card>
      <Card>
        <h2>About</h2>
        <p className="small muted">Breeder's Assistant is for gamefowl breeding records, pedigree, incubation and flock health. Guides are general information, not veterinary advice.</p>
      </Card>
      <button className="btn danger ghost" onClick={wipe}>Delete all data</button>
    </div>
  );
}
