import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, Search, Download, X, Inbox, Send, Briefcase, BellRing, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { STATUSES, PRIORITIES, STATUS_STYLE } from '../constants';
import ApplicationCard from '../components/ApplicationCard.jsx';
import ApplicationModal from '../components/ApplicationModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { followUpState, fmtDateTime } from '../utils';

export default function Board() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('');
  const [tag, setTag] = useState('');
  const [modal, setModal] = useState(null); // { app, status }
  const searchRef = useRef(null);
  const { user } = useAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const insight = useMemo(() => {
    const active = apps.filter((a) => ['Applied', 'Screening', 'Interview'].includes(a.status)).length;
    const followUps = apps
      .map((app) => ({ app, f: followUpState(app) }))
      .filter((x) => x.f && (x.f.tone === 'overdue' || x.f.text === 'Follow up today'));
    const weekAhead = Date.now() + 7 * 86400000;
    const interviews = apps
      .flatMap((app) => (app.interviews || []).map((i) => ({ app, i })))
      .filter(({ i }) => i.date && new Date(i.date) >= new Date() && new Date(i.date) <= weekAhead)
      .sort((a, b) => new Date(a.i.date) - new Date(b.i.date));
    return { active, followUps, interviews };
  }, [apps]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/applications');
      setApps(data.applications);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // keyboard shortcuts: N = new application, / = focus search
  useEffect(() => {
    const onKey = (e) => {
      if (modal || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'n') { e.preventDefault(); setModal({ app: null, status: 'Applied' }); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  const allTags = useMemo(() => [...new Set(apps.flatMap((a) => a.tags || []))].sort(), [apps]);
  const filtering = !!(q || priority || tag);

  const columns = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (a) =>
      (!needle || [a.company, a.role, a.location, ...(a.tags || [])].join(' ').toLowerCase().includes(needle)) &&
      (!priority || a.priority === priority) &&
      (!tag || a.tags?.includes(tag));
    return Object.fromEntries(
      STATUSES.map((s) => [s, apps.filter((a) => a.status === s && match(a)).sort((a, b) => a.order - b.order)])
    );
  }, [apps, q, priority, tag]);

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Only runs with no filters active, so `columns` holds every card
    const src = [...columns[source.droppableId]];
    const [moved] = src.splice(source.index, 1);
    const sameCol = source.droppableId === destination.droppableId;
    const dst = sameCol ? src : [...columns[destination.droppableId]];
    dst.splice(destination.index, 0, { ...moved, status: destination.droppableId });

    const next = { ...columns, [source.droppableId]: src, [destination.droppableId]: dst };
    const items = [];
    new Set([source.droppableId, destination.droppableId]).forEach((s) =>
      next[s].forEach((a, i) => items.push({ id: a._id, status: s, order: i }))
    );
    const byId = new Map(items.map((i) => [i.id, i]));

    // optimistic update, roll back on failure
    setApps((prev) => prev.map((a) => (byId.has(a._id) ? { ...a, status: byId.get(a._id).status, order: byId.get(a._id).order } : a)));
    try {
      await api.post('/applications/reorder', { movedId: draggableId, items });
      if (!sameCol) toast.success(`${moved.company} moved to ${destination.droppableId}`);
    } catch (err) {
      toast.error(errMsg(err));
      load();
    }
  };

  const onSaved = (saved) => {
    setApps((prev) => (prev.some((a) => a._id === saved._id) ? prev.map((a) => (a._id === saved._id ? saved : a)) : [...prev, saved]));
    setModal(null);
  };
  const onDeleted = (id) => { setApps((prev) => prev.filter((a) => a._id !== id)); setModal(null); };

  const exportCsv = () => {
    const cols = ['company', 'role', 'status', 'priority', 'salary', 'location', 'link', 'appliedDate', 'followUpDate', 'tags'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [cols.join(','), ...apps.map((a) => cols.map((c) => esc(c === 'tags' ? a.tags.join('; ') : a[c])).join(','))];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'applications.csv' });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {!loading && apps.length > 0 && (
        <div className="mb-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{greeting}, {user?.name?.split(' ')[0]}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {insight.followUps.length + insight.interviews.length > 0
                  ? 'Here is what needs your attention.'
                  : 'You are all caught up. Keep the momentum going.'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: Send, label: 'Total applied', value: apps.length, color: 'text-sky-500' },
              { icon: Briefcase, label: 'In progress', value: insight.active, color: 'text-teal-600' },
              { icon: BellRing, label: 'Follow-ups due', value: insight.followUps.length, color: 'text-amber-500' },
              { icon: CalendarClock, label: 'Interviews this week', value: insight.interviews.length, color: 'text-violet-500' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="panel flex items-center gap-3 p-3.5">
                <div className={`grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-ink-800 ${color}`}><Icon size={20} /></div>
                <div>
                  <div className="text-2xl font-extrabold leading-none">{value}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {insight.followUps.length + insight.interviews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {insight.followUps.map(({ app, f }) => (
                <button key={`f-${app._id}`} onClick={() => setModal({ app })}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition hover:opacity-80 ${
                    f.tone === 'overdue'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  }`}>
                  <BellRing size={12} /> {app.company}: {f.text.toLowerCase()}
                </button>
              ))}
              {insight.interviews.map(({ app, i }, n) => (
                <button key={`i-${app._id}-${n}`} onClick={() => setModal({ app })}
                  className="flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 transition hover:opacity-80 dark:bg-violet-500/15 dark:text-violet-300">
                  <CalendarClock size={12} /> {app.company}: {i.type} interview, {fmtDateTime(i.date)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input ref={searchRef} className="input !pl-9" placeholder="Search company, role, tag   ( / )" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="input !w-auto" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
          <option value="">All tags</option>
          {allTags.map((t) => <option key={t}>{t}</option>)}
        </select>
        {filtering && (
          <button className="btn-ghost" onClick={() => { setQ(''); setPriority(''); setTag(''); }}><X size={14} /> Clear</button>
        )}
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" onClick={exportCsv} disabled={!apps.length}><Download size={15} /> <span className="hidden sm:inline">Export CSV</span></button>
          <button className="btn-primary" onClick={() => setModal({ app: null, status: 'Applied' })}><Plus size={16} /> Add application</button>
        </div>
      </div>

      {filtering && <p className="mb-2 text-xs text-slate-500">Drag and drop is paused while filters are active.</p>}

      {loading ? (
        <div className="flex gap-3">
          {STATUSES.map((s) => <div key={s} className="h-64 w-72 shrink-0 animate-pulse rounded-xl bg-slate-200/70 dark:bg-ink-800" />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="panel mx-auto mt-16 max-w-md p-10 text-center">
          <Inbox className="mx-auto mb-3 text-teal-600" size={36} />
          <h3 className="text-lg font-extrabold">No applications yet</h3>
          <p className="mt-1 text-sm text-slate-500">Add the first role you’ve applied to. Press <kbd className="rounded border px-1">N</kbd> any time.</p>
          <button className="btn-primary mt-5" onClick={() => setModal({ app: null, status: 'Applied' })}><Plus size={16} /> Add application</button>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="board-scroll flex gap-3 overflow-x-auto pb-4">
            {STATUSES.map((status) => (
              <div key={status} className={`flex h-[calc(100vh-360px)] min-h-[420px] min-w-[260px] flex-1 shrink-0 flex-col rounded-xl border-t-4 bg-slate-100/80 dark:bg-ink-900 ${STATUS_STYLE[status].bar}`}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLE[status].dot}`} />
                    {status}
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-ink-800">{columns[status].length}</span>
                  </div>
                  <button onClick={() => setModal({ app: null, status })} className="rounded p-1 text-slate-500 hover:bg-white dark:hover:bg-ink-800" aria-label={`Add to ${status}`}>
                    <Plus size={16} />
                  </button>
                </div>
                <Droppable droppableId={status}>
                  {(p, snap) => (
                    <div ref={p.innerRef} {...p.droppableProps}
                      className={`min-h-[80px] flex-1 overflow-y-auto px-2.5 pb-2 transition-colors ${snap.isDraggingOver ? 'bg-teal-500/10' : ''}`}>
                      {columns[status].map((app, i) => (
                        <ApplicationCard key={app._id} app={app} index={i} dragDisabled={filtering} onOpen={(a) => setModal({ app: a })} />
                      ))}
                      {columns[status].length === 0 && !snap.isDraggingOver && (
                        <div className="grid min-h-[160px] place-items-center rounded-lg border-2 border-dashed border-slate-300/70 p-4 text-center text-xs text-slate-400 dark:border-ink-700">
                          {filtering ? 'No matches' : 'Drag a card here or click +'}
                        </div>
                      )}
                      {p.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {modal && (
        <ApplicationModal app={modal.app} defaultStatus={modal.status} onClose={() => setModal(null)} onSaved={onSaved} onDeleted={onDeleted} />
      )}
    </>
  );
}