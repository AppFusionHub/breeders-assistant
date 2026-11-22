import { describe, expect, it } from 'vitest';
import { googleCalendarUrl, lastOccurrence, occurrenceCount, occursOn, toICS, type ReminderLike } from './reminders';

const once: ReminderLike = { title: 'Deworm', date: '2026-12-01', time: '06:30', repeat: { kind: 'once' } };
const weekly: ReminderLike = { title: 'Vitamins', date: '2026-12-01', time: '07:00', repeat: { kind: 'every', days: 7 }, endDate: '2026-12-29' };

describe('occurrences', () => {
  it('once', () => {
    expect(occursOn(once, '2026-12-01')).toBe(true);
    expect(occursOn(once, '2026-12-02')).toBe(false);
  });
  it('every N days with end date', () => {
    expect(occursOn(weekly, '2026-12-08')).toBe(true);
    expect(occursOn(weekly, '2026-12-09')).toBe(false);
    expect(occursOn(weekly, '2026-12-29')).toBe(true);
    expect(occursOn(weekly, '2027-01-05')).toBe(false);
    expect(occursOn(weekly, '2026-11-24')).toBe(false);
    expect(occurrenceCount(weekly)).toBe(5);
    expect(lastOccurrence(weekly)).toBe('2026-12-29');
  });
  it('crosses month and year boundaries', () => {
    const daily: ReminderLike = { ...once, date: '2026-12-30', repeat: { kind: 'every', days: 1 } };
    expect(occursOn(daily, '2027-01-02')).toBe(true);
  });
});

describe('calendar export', () => {
  it('builds a valid ICS with alarm and recurrence', () => {
    const ics = toICS([{ ...weekly, notes: 'Label dose, a; b', uid: 'r1' }]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART;TZID=Asia/Manila:20261201T070000');
    expect(ics).toContain('RRULE:FREQ=DAILY;INTERVAL=7;UNTIL=20261229T235900');
    expect(ics).toContain('TRIGGER:PT0M');
    expect(ics).toContain('DESCRIPTION:Label dose\\, a\; b');
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
  });
  it('builds a Google Calendar link', () => {
    const u = new URL(googleCalendarUrl(once));
    expect(u.searchParams.get('dates')).toBe('20261201T063000/20261201T064500');
    expect(u.searchParams.get('recur')).toBeNull();
  });
});
