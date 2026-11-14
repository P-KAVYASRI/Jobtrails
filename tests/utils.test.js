import { describe, it, expect } from 'vitest';
import { followUpState, buildMonthGrid, nextInterview, localKey } from '../src/utils.js';

const DAY = 86400000;
const inDays = (n) => new Date(Date.now() + n * DAY).toISOString();

describe('followUpState', () => {
  it('flags overdue follow-ups', () => {
    expect(followUpState({ status: 'Applied', followUpDate: inDays(-3) }).tone).toBe('overdue');
  });
  it('flags follow-ups due today', () => {
    expect(followUpState({ status: 'Applied', followUpDate: new Date().toISOString() }).text).toBe('Follow up today');
  });
  it('treats far-away dates as "later"', () => {
    expect(followUpState({ status: 'Screening', followUpDate: inDays(10) }).tone).toBe('later');
  });
  it('ignores finished applications and missing dates', () => {
    expect(followUpState({ status: 'Offer', followUpDate: inDays(-3) })).toBeNull();
    expect(followUpState({ status: 'Applied' })).toBeNull();
  });
});

describe('buildMonthGrid', () => {
  it('returns 42 consecutive days starting on a Monday', () => {
    const grid = buildMonthGrid(2026, 10); // November 2026
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(1);
    expect(localKey(grid[0])).toBe('2026-10-26');
    grid.slice(1).forEach((d, i) => expect(d - grid[i]).toBeGreaterThan(0));
  });
});

describe('nextInterview', () => {
  it('picks the soonest future interview', () => {
    const app = { interviews: [{ type: 'HR', date: inDays(5) }, { type: 'Phone', date: inDays(1) }, { type: 'Old', date: inDays(-2) }] };
    expect(nextInterview(app).type).toBe('Phone');
  });
  it('returns null when nothing is upcoming', () => {
    expect(nextInterview({ interviews: [] })).toBeNull();
  });
});
