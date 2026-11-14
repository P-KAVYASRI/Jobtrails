// Ghost detector: pure functions shared by the Express API and the React app.
// An application is "quiet" when nothing has happened for longer than is normal for its stage.
const DAY = 86400000;

// days of silence before we nudge / before we call it ghosted, per stage
export const GHOST_RULES = {
  Applied:   { nudge: 7, ghosted: 21 },
  Screening: { nudge: 5, ghosted: 14 },
  Interview: { nudge: 4, ghosted: 10 },
};

const latest = (...dates) =>
  dates.filter(Boolean).map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t)).reduce((a, b) => Math.max(a, b), 0);

/**
 * Returns null for finished applications, otherwise
 * { level: 'ok' | 'nudge' | 'ghosted', daysQuiet, since, rule }
 * "Last activity" = newest of: applied date, last stage change, last interview that already
 * happened, and the last time the user sent a follow-up.
 */
export function ghostInfo(app, now = new Date()) {
  const rule = GHOST_RULES[app.status];
  if (!rule) return null;
  const nowMs = new Date(now).getTime();
  const pastInterviews = (app.interviews || []).map((i) => i.date).filter((d) => d && new Date(d).getTime() <= nowMs);
  const since = latest(app.appliedDate, app.statusChangedAt, app.lastNudgedAt, ...pastInterviews);
  if (!since) return null;
  const daysQuiet = Math.max(0, Math.floor((nowMs - since) / DAY));
  const level = daysQuiet >= rule.ghosted ? 'ghosted' : daysQuiet >= rule.nudge ? 'nudge' : 'ok';
  return { level, daysQuiet, since: new Date(since), rule };
}

export const GHOST_LABEL = {
  nudge: (d) => `Quiet for ${d}d`,
  ghosted: (d) => `Likely ghosted · ${d}d`,
};

// Which follow-up message fits this situation (1st nudge, 2nd nudge, or a polite last note)
export function followUpStage(app, info) {
  const sent = app.nudgeCount || 0;
  if (sent >= 2 || info?.level === 'ghosted') return 'final';
  if (sent === 1) return 'second';
  return 'first';
}
