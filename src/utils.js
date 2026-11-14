import { ghostInfo, GHOST_LABEL } from '../shared/ghost.js';
const DAY = 86400000;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const timeAgo = (d) => {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

// Follow-up reminder state for a card
export function followUpState(app) {
  if (!app.followUpDate || ['Offer', 'Rejected'].includes(app.status)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(app.followUpDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / DAY);
  if (diff < 0) return { text: `Follow-up overdue by ${-diff}d`, tone: 'overdue' };
  if (diff === 0) return { text: 'Follow up today', tone: 'soon' };
  if (diff <= 3) return { text: `Follow up in ${diff}d`, tone: 'soon' };
  return { text: `Follow up ${fmtDate(app.followUpDate)}`, tone: 'later' };
}

export const FOLLOW_STYLE = {
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  soon: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  later: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
};

// ---------- v2 helpers ----------
export const toInputDateTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// local YYYY-MM-DD key (used to place interviews on the calendar)
export const localKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// 42 days (6 weeks, Monday first) covering the given month
export function buildMonthGrid(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}

export const nextInterview = (app) =>
  (app.interviews || [])
    .filter((i) => i.date && new Date(i.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;

// ---------- v3: ghost detector + match score ----------
export { ghostInfo };

export const GHOST_STYLE = {
  nudge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  ghosted: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

// null when the application is fine, otherwise { level, text }
export function ghostChip(app) {
  const g = ghostInfo(app);
  if (!g || g.level === 'ok') return null;
  return { level: g.level, text: GHOST_LABEL[g.level](g.daysQuiet) };
}

export const matchStyle = (score) =>
  score >= 70
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
    : score >= 40
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300';

// ?tab=followup in the URL -> modal tab name
export const TAB_FROM_PARAM = { details: 'Details', interviews: 'Interviews', match: 'Match', followup: 'Follow-up', ai: 'AI assistant' };
