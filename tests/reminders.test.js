import { describe, it, expect } from 'vitest';
import { classifyFollowUps, buildReminderEmail } from '../server/services/reminders.js';

const now = new Date('2026-11-14T08:00:00Z');
const at = (d) => new Date(`2026-11-${d}T00:00:00Z`);

describe('classifyFollowUps', () => {
  it('groups follow-ups by urgency', () => {
    const apps = [
      { company: 'A', followUpDate: at('12') },
      { company: 'B', followUpDate: at('14') },
      { company: 'C', followUpDate: at('15') },
      { company: 'D', followUpDate: at('20') },
    ];
    const g = classifyFollowUps(apps, now);
    expect(g.overdue.map((a) => a.company)).toEqual(['A']);
    expect(g.today.map((a) => a.company)).toEqual(['B']);
    expect(g.tomorrow.map((a) => a.company)).toEqual(['C']);
  });
});

describe('buildReminderEmail', () => {
  it('returns null when there is nothing to report', () => {
    expect(buildReminderEmail({ name: 'Kavya' }, [], [], now)).toBeNull();
  });
  it('escapes HTML in company names', () => {
    const mail = buildReminderEmail({ name: 'Kavya' }, [{ company: '<script>x</script>', role: 'Dev', followUpDate: at('14') }], [], now);
    expect(mail.html).not.toContain('<script>');
    expect(mail.subject).toContain('1 thing');
  });
});
