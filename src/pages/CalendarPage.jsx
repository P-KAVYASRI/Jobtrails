import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarClock, BellRing, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import ApplicationModal from '../components/ApplicationModal.jsx';
import { buildMonthGrid, localKey, toInputDate } from '../utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const parseKey = (k) => new Date(`${k}T00:00:00`);
const longDate = (k) => parseKey(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

function relativeLabel(key, todayKey) {
  const diff = Math.round((parseKey(key) - parseKey(todayKey)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return parseKey(key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const STYLE = {
  interview: {
    pill: 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/30',
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    Icon: CalendarClock,
  },
  follow: {
    pill: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    Icon: BellRing,
  },
};

function EventRow({ ev, onOpen }) {
  const { icon, Icon } = STYLE[ev.kind];
  return (
    <button onClick={() => onOpen(ev.app)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-slate-100 dark:hover:bg-ink-800">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${icon}`}><Icon size={15} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{ev.app.company}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{ev.sub}</span>
      </span>
      {ev.time && <span className="shrink-0 text-xs font-semibold text-slate-500">{ev.time}</span>}
    </button>
  );
}

export default function CalendarPage() {
  const [apps, setApps] = useState([]);
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => localKey(new Date()));
  const [modal, setModal] = useState(null);

  const load = useCallback(() => {
    api.get('/applications').then((r) => setApps(r.data.applications)).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const shift = useCallback((n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1)), []);

  // arrow keys switch months
  useEffect(() => {
    const onKey = (e) => {
      if (modal || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') shift(-1);
      if (e.key === 'ArrowRight') shift(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, shift]);

  // events grouped by day key (YYYY-MM-DD)
  const events = useMemo(() => {
    const map = {};
    const add = (key, ev) => (map[key] = map[key] || []).push(ev);
    apps.forEach((a) => {
      if (a.followUpDate && !['Offer', 'Rejected'].includes(a.status))
        add(toInputDate(a.followUpDate), { kind: 'follow', app: a, time: '', sub: `Follow up · ${a.role}` });
      (a.interviews || []).forEach((i) => {
        if (!i.date) return;
        const time = new Date(i.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        add(localKey(i.date), { kind: 'interview', app: a, time, sub: `${i.type} interview${i.interviewer ? ` with ${i.interviewer}` : ''}` });
      });
    });
    Object.values(map).forEach((list) =>
      list.sort((x, y) => (x.kind === y.kind ? x.time.localeCompare(y.time) : x.kind === 'interview' ? -1 : 1))
    );
    return map;
  }, [apps]);

  const todayKey = localKey(new Date());
  const grid = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
  const monthPrefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  const monthCounts = useMemo(() => {
    let interviews = 0, follow = 0;
    Object.entries(events).forEach(([k, list]) => {
      if (!k.startsWith(monthPrefix)) return;
      list.forEach((e) => (e.kind === 'interview' ? interviews++ : follow++));
    });
    return { interviews, follow };
  }, [events, monthPrefix]);

  // next 14 days, grouped
  const upcoming = useMemo(() => {
    const end = localKey(new Date(Date.now() + 14 * 86400000));
    return Object.keys(events).filter((k) => k >= todayKey && k <= end).sort().map((k) => ({ key: k, list: events[k] }));
  }, [events, todayKey]);

  const selectedEvents = events[selected] || [];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> {monthCounts.interviews} interview{monthCounts.interviews === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> {monthCounts.follow} follow-up{monthCounts.follow === 1 ? '' : 's'}</span>
          </p>
        </div>
        <div className="flex gap-1">
          <button className="btn-ghost !p-2" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button className="btn-ghost" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(todayKey); }}>Today</button>
          <button className="btn-ghost !p-2" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-ink-700 dark:bg-ink-800/50">
            {DAYS.map((d) => <div key={d} className="py-2.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((d, idx) => {
              const key = localKey(d);
              const list = events[key] || [];
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = key === todayKey;
              const isSel = key === selected;
              const weekend = idx % 7 >= 5;
              return (
                <div key={key} onClick={() => setSelected(key)}
                  className={`min-h-[108px] cursor-pointer border-b border-r border-slate-100 p-1.5 transition dark:border-ink-800
                    ${isToday ? 'bg-teal-50/70 dark:bg-teal-500/10' : weekend ? 'bg-slate-50/60 dark:bg-ink-950/40' : ''}
                    ${inMonth ? '' : 'opacity-40'}
                    ${isSel ? 'relative z-10 ring-2 ring-inset ring-teal-500' : 'hover:bg-slate-50 dark:hover:bg-ink-800/60'}`}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-bold ${isToday ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{d.getDate()}</span>
                    {list.length > 0 && <span className="text-[10px] font-semibold text-slate-400">{list.length}</span>}
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 2).map((ev, i) => (
                      <button key={i} onClick={(e) => { e.stopPropagation(); setModal(ev.app); }}
                        className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold transition ${STYLE[ev.kind].pill}`}>
                        <span className="truncate">{ev.time ? `${ev.time} ` : ''}{ev.app.company}</span>
                      </button>
                    ))}
                    {list.length > 2 && <p className="px-1 text-[11px] font-semibold text-slate-400">+{list.length - 2} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="panel p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Selected day</p>
            <h2 className="mb-2 text-lg font-extrabold">{longDate(selected)}</h2>
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-5 text-center text-sm text-slate-400">
                <CalendarCheck size={26} className="text-slate-300 dark:text-ink-700" />
                Nothing scheduled.
              </div>
            ) : (
              <div className="-mx-2 space-y-0.5">{selectedEvents.map((ev, i) => <EventRow key={i} ev={ev} onOpen={setModal} />)}</div>
            )}
          </div>

          <div className="panel p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Coming up</p>
            <h2 className="mb-2 text-lg font-extrabold">Next 14 days</h2>
            {upcoming.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                You are clear for the next two weeks. Add interview rounds or follow-up dates from any application card.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map(({ key, list }) => (
                  <div key={key}>
                    <button onClick={() => { setSelected(key); setCursor(new Date(parseKey(key).getFullYear(), parseKey(key).getMonth(), 1)); }}
                      className="mb-0.5 text-xs font-bold text-teal-700 hover:underline dark:text-teal-300">{relativeLabel(key, todayKey)}</button>
                    <div className="-mx-2 space-y-0.5">{list.map((ev, i) => <EventRow key={i} ev={ev} onOpen={setModal} />)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="px-1 text-xs text-slate-400">Tip: use the left and right arrow keys to change month.</p>
        </aside>
      </div>

      {modal && (
        <ApplicationModal
          app={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
          onDeleted={() => { setModal(null); load(); }}
        />
      )}
    </>
  );
}