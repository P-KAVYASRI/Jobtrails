import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, Search, Download, X, Inbox, Send, Briefcase, BellRing, CalendarClock, Ghost } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { STATUSES, PRIORITIES, STATUS_STYLE } from '../constants';
import ApplicationCard from '../components/ApplicationCard.jsx';
import ApplicationModal from '../components/ApplicationModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { followUpState, fmtDateTime, ghostInfo, TAB_FROM_PARAM } from '../utils';

export default function Board() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('');
  const [tag, setTag] = useState('');
  const [quietOnly, setQuietOnly] = useState(false);
  const [modal, setModal] = useState(null); // { app, status, tab }
  const [params, setParams] = useSearchParams();
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
    const quiet = apps.filter((a) => { const g = ghostInfo(a); return g && g.level !== 'ok'; }).length;
    return { active, followUps, interviews, quiet };
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

  // deep links: /board?open=<id>&tab=followup|match|interviews|ai   (also open=new)
  useEffect(() => {
    const id = params.get('open');
    if (!id || loading) return;
    const tab = TAB_FROM_PARAM[params.get('tab')] || 'Details';
    if (id === 'new') setModal({ app: null, status: 'Applied', tab });
    else {
      const found = apps.find((a) => a._id === id);
      if (found) setModal({ app: found, tab });
      else toast.error('That application no longer exists.');
    }
    setParams({}, { replace: true });
  }, [params, loading, apps, setParams]);

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
  const filtering = !!(q || priority || tag || quietOnly);

  const columns = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (a) =>
      (!needle || [a.company, a.role, a.location, ...(a.tags || [])].join(' ').toLowerCase().includes(needle)) &&
      (!priority || a.priority === priority) &&
      (!tag || a.tags?.includes(tag)) &&
      (!quietOnly || (ghostInfo(a)?.level ?? 'ok') !== 'ok');
    return Object.fromEntries(
      STATUSES.map((s) => [s, apps.filter((a) => a.status === s && match(a)).sort((a, b) => a.order - b.order)])
    );
  }, [apps, q, priority, tag, quietOnly]);

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
  const onPatched = (saved) => setApps((prev) => prev.map((a) => (a._id === saved._id ? saved : a)));
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

  const newApp = () => setModal({ app: null, status: 'Applied' });
  const needsAttention = insight.followUps.length + insight.interviews.length + insight.quiet > 0;

  const stats = [
    { icon: Send, label: 'Total applied', value: apps.length },
    { icon: Briefcase, label: 'In progress', value: insight.active },
    { icon: BellRing, label: 'Follow-ups due', value: insight.followUps.length },
    { icon: CalendarClock, label: 'Interviews this week', value: insight.interviews.length },
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{loading || !apps.length ? 'Your board' : `${greeting}, ${user?.name?.split(' ')[0]}`}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {!apps.length ? 'Track every application in one place.' : needsAttention ? 'A few things need your attention.' : 'You are all caught up.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={exportCsv} disabled={!apps.length}><Download size={15} /> <span className="hidden sm:inline">Export CSV</span></button>
          <button className="btn-primary" onClick={newApp}><Plus size={16} /> Add application <span className="kbd !border-teal-500 !bg-teal-700 !text-teal-100">N</span></button>
        </div>
      </div>

      {!loading && apps.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-sm dark:border-ink-700 dark:bg-ink-700 lg:grid-cols-4">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white px-4 py-3.5 dark:bg-ink-900">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><Icon size={13} /> {label}</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
              </div>
            ))}
          </div>

          {needsAttention && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {insight.quiet > 0 && (
                <button onClick={() => setQuietOnly((v) => !v)}
                  className={`chip !px-2.5 !py-1 !text-xs ring-1 ring-inset transition ${
                    quietOnly
                      ? 'bg-amber-500 text-white ring-amber-500'
                      : 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30'
                  }`}>
                  <Ghost size={12} /> {insight.quiet} gone quiet {quietOnly ? '· showing only these' : '· review'}
                </button>
              )}
              {insight.followUps.map(({ app, f }) => (
                <button key={`f-${app._id}`} onClick={() => setModal({ app })}
                  className={`chip !px-2.5 !py-1 !text-xs transition hover:opacity-80 ${
                    f.tone === 'overdue'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  }`}>
                  <BellRing size={12} /> {app.company}: {f.text.toLowerCase()}
                </button>
              ))}
              {insight.interviews.map(({ app, i }, n) => (
                <button key={`i-${app._id}-${n}`} onClick={() => setModal({ app })}
                  className="chip !px-2.5 !py-1 !text-xs bg-violet-100 text-violet-700 transition hover:opacity-80 dark:bg-violet-500/15 dark:text-violet-300">
                  <CalendarClock size={12} /> {app.company}: {i.type} interview, {fmtDateTime(i.date)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="my-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input ref={searchRef} className="input !pl-9 !pr-9" placeholder="Search company, role, tag" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="kbd absolute right-2.5 top-1/2 -translate-y-1/2">/</span>
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
          <button className="btn-ghost" onClick={() => { setQ(''); setPriority(''); setTag(''); setQuietOnly(false); }}><X size={14} /> Clear filters</button>
        )}
        {filtering && <span className="text-xs text-slate-400">Drag and drop is paused while filters are on.</span>}
      </div>

      {loading ? (
        <div className="flex gap-3">
          {STATUSES.map((s) => <div key={s} className="h-64 w-72 shrink-0 animate-pulse rounded-xl bg-slate-200/70 dark:bg-ink-800" />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="panel mx-auto mt-12 max-w-md p-10 text-center">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-teal-600/10 text-teal-600"><Inbox size={22} /></div>
          <h3 className="text-base font-semibold">No applications yet</h3>
          <p className="mt-1 text-sm text-slate-500">Add the first role you applied to. Press <span className="kbd">N</span> any time.</p>
          <button className="btn-primary mt-5" onClick={newApp}><Plus size={16} /> Add application</button>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="board-scroll flex gap-3 overflow-x-auto pb-4">
            {STATUSES.map((status) => (
              <div key={status} className="flex h-[calc(100vh-380px)] min-h-[420px] min-w-[268px] flex-1 shrink-0 flex-col rounded-xl bg-slate-100/70 ring-1 ring-inset ring-slate-200/80 dark:bg-ink-900/60 dark:ring-ink-700">
                <div className="flex items-center justify-between px-3 pb-1.5 pt-3">
                  <div className="flex items-center gap-2 text-[13px] font-semibold">
                    <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[status].dot}`} />
                    {status}
                    <span className="text-xs font-medium tabular-nums text-slate-400">{columns[status].length}</span>
                  </div>
                  <button onClick={() => setModal({ app: null, status })} className="btn-icon !h-6 !w-6" aria-label={`Add to ${status}`}>
                    <Plus size={15} />
                  </button>
                </div>
                <Droppable droppableId={status}>
                  {(p, snap) => (
                    <div ref={p.innerRef} {...p.droppableProps}
                      className={`lane-scroll min-h-[80px] flex-1 overflow-y-auto rounded-b-xl px-2 pb-2 pt-1 transition-colors ${snap.isDraggingOver ? 'bg-teal-500/10' : ''}`}>
                      {columns[status].map((app, i) => (
                        <ApplicationCard key={app._id} app={app} index={i} dragDisabled={filtering} onOpen={(a, tab) => setModal({ app: a, tab })} />
                      ))}
                      {columns[status].length === 0 && !snap.isDraggingOver && (
                        <div className="grid min-h-[140px] place-items-center rounded-lg border border-dashed border-slate-300/80 p-4 text-center text-xs text-slate-400 dark:border-ink-700">
                          {filtering ? 'No matches' : 'Drop a card here'}
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
        <ApplicationModal app={modal.app} defaultStatus={modal.status} initialTab={modal.tab}
          onClose={() => setModal(null)} onSaved={onSaved} onPatched={onPatched} onDeleted={onDeleted} />
      )}
    </>
  );
}
