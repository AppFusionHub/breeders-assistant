import { useEffect } from 'react';
import { db } from './db';
import { today } from './lib/dates';
import { occursOn } from './lib/reminders';

const KEY = 'ba-notified';

/** While the app is open, show a system notification when a reminder's time arrives. */
export function useInAppNotifications() {
  useEffect(() => {
    if (!('Notification' in window)) return;
    async function tick() {
      if (Notification.permission !== 'granted') return;
      const t = today();
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      let sent: string[] = [];
      try { sent = JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { /* ignore */ }
      const rems = await db.reminders.filter((r) => r.active && r.time <= hhmm && occursOn(r, t)).toArray();
      const done = new Set((await db.reminderDone.where('date').equals(t).toArray()).map((d) => d.reminderId));
      const reg = await navigator.serviceWorker?.getRegistration();
      for (const r of rems) {
        const k = `${r.id}|${t}`;
        if (done.has(r.id) || sent.includes(k)) continue;
        // Only notify for times within the last 30 minutes, so opening the app later doesn't spam old reminders.
        const [h, m] = r.time.split(':').map(Number);
        if (now.getHours() * 60 + now.getMinutes() - (h * 60 + m) > 30) { sent.push(k); continue; }
        const opts = { body: r.notes?.slice(0, 120) ?? '', tag: k, icon: './icon-192.png' };
        if (reg) await reg.showNotification(r.title, opts); else new Notification(r.title, opts);
        sent.push(k);
      }
      try { localStorage.setItem(KEY, JSON.stringify(sent.slice(-200))); } catch { /* ignore */ }
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
}
