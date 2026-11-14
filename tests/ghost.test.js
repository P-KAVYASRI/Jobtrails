import { describe, it, expect } from 'vitest';
import { ghostInfo, followUpStage } from '../shared/ghost.js';
import { buildFollowUpDraft } from '../shared/followup.js';

const now = new Date('2026-11-14T10:00:00Z');
const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();

describe('ghostInfo', () => {
  it('is fine right after applying', () => {
    expect(ghostInfo({ status: 'Applied', appliedDate: ago(2), statusChangedAt: ago(2) }, now).level).toBe('ok');
  });
  it('nudges, then calls it ghosted, using stage-specific limits', () => {
    expect(ghostInfo({ status: 'Applied', appliedDate: ago(9), statusChangedAt: ago(9) }, now).level).toBe('nudge');
    expect(ghostInfo({ status: 'Applied', appliedDate: ago(25), statusChangedAt: ago(25) }, now).level).toBe('ghosted');
    expect(ghostInfo({ status: 'Interview', appliedDate: ago(30), statusChangedAt: ago(11) }, now).level).toBe('ghosted');
  });
  it('ignores finished applications', () => {
    expect(ghostInfo({ status: 'Offer', appliedDate: ago(90) }, now)).toBeNull();
    expect(ghostInfo({ status: 'Rejected', appliedDate: ago(90) }, now)).toBeNull();
  });
  it('resets the timer after a follow-up or a past interview', () => {
    const base = { status: 'Screening', appliedDate: ago(30), statusChangedAt: ago(30) };
    expect(ghostInfo({ ...base, lastNudgedAt: ago(1) }, now).level).toBe('ok');
    expect(ghostInfo({ ...base, interviews: [{ date: ago(2) }] }, now).daysQuiet).toBe(2);
  });
  it('does not count future interviews as activity', () => {
    const r = ghostInfo({ status: 'Interview', appliedDate: ago(20), statusChangedAt: ago(20), interviews: [{ date: ago(-3) }] }, now);
    expect(r.daysQuiet).toBe(20);
  });
});

describe('follow-up coach', () => {
  const app = { company: 'Northwind', role: 'Frontend Developer', status: 'Applied', appliedDate: ago(9), statusChangedAt: ago(9), contactName: 'Priya Rao' };
  it('writes a personal first nudge', () => {
    const d = buildFollowUpDraft(app, { name: 'Kavya Nair' }, now);
    expect(d.stage).toBe('first');
    expect(d.subject).toContain('Frontend Developer');
    expect(d.body).toContain('Hi Priya,');
    expect(d.body).toContain('9 days ago');
    expect(d.body).toContain('Kavya Nair');
  });
  it('escalates to a second and a final message', () => {
    expect(followUpStage({ ...app, nudgeCount: 1 }, ghostInfo(app, now))).toBe('second');
    expect(followUpStage({ ...app, nudgeCount: 2 }, ghostInfo(app, now))).toBe('final');
    const late = { ...app, appliedDate: ago(30), statusChangedAt: ago(30) };
    expect(buildFollowUpDraft(late, {}, now).subject).toMatch(/Closing the loop/);
  });
  it('uses a thank-you tone after an interview', () => {
    expect(buildFollowUpDraft({ ...app, status: 'Interview' }, {}, now).body).toMatch(/Thank you again/);
  });
  it('falls back gracefully without a contact name', () => {
    expect(buildFollowUpDraft({ ...app, contactName: '' }, {}, now).body.startsWith('Hi there,')).toBe(true);
  });
});
