import { useEffect, useState } from 'react';
import { X, Trash2, Loader2, ArrowRight, Plus, Sparkles, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { STATUSES, PRIORITIES, STATUS_STYLE, INTERVIEW_TYPES } from '../constants';
import { toInputDate, toInputDateTime, timeAgo } from '../utils';

const Field = ({ label, children, className = '' }) => (
  <label className={`block text-xs font-semibold text-slate-600 dark:text-slate-400 ${className}`}>
    {label}
    <div className="mt-1 text-sm font-normal">{children}</div>
  </label>
);

const Dot = ({ s }) => <span className={`inline-block h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} />;

const AI_TASKS = [
  { id: 'cover_letter', label: 'Draft cover letter' },
  { id: 'interview_questions', label: 'Interview questions' },
  { id: 'match_summary', label: 'Skills match' },
];

export default function ApplicationModal({ app, defaultStatus, onClose, onSaved, onDeleted }) {
  const editing = !!app;
  const [tab, setTab] = useState('Details');
  const [form, setForm] = useState(() => ({
    company: app?.company || '',
    role: app?.role || '',
    status: app?.status || defaultStatus || 'Applied',
    priority: app?.priority || 'Medium',
    salary: app?.salary || '',
    location: app?.location || '',
    link: app?.link || '',
    notes: app?.notes || '',
    contactName: app?.contactName || '',
    contactEmail: app?.contactEmail || '',
    appliedDate: toInputDate(app?.appliedDate || new Date()),
    followUpDate: toInputDate(app?.followUpDate),
    tags: (app?.tags || []).join(', '),
    jobDescription: app?.jobDescription || '',
    interviews: (app?.interviews || []).map((i) => ({ ...i, date: toInputDateTime(i.date) })),
  }));
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [background, setBackground] = useState(() => { try { return localStorage.getItem('jt_background') || ''; } catch { return ''; } });
  const [ai, setAi] = useState({ loading: '', result: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (editing) api.get(`/applications/${app._id}/activity`).then((r) => setHistory(r.data.activity)).catch(() => {});
  }, [editing, app]);

  // ----- interviews -----
  const addRound = () =>
    setForm({ ...form, interviews: [...form.interviews, { round: `Round ${form.interviews.length + 1}`, type: 'Technical', date: '', interviewer: '', notes: '' }] });
  const setRound = (idx, k, v) =>
    setForm({ ...form, interviews: form.interviews.map((r, i) => (i === idx ? { ...r, [k]: v } : r)) });
  const delRound = (idx) => setForm({ ...form, interviews: form.interviews.filter((_, i) => i !== idx) });

  // ----- save / delete -----
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      appliedDate: form.appliedDate || undefined,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      interviews: form.interviews.map(({ _id, ...r }) => ({ ...r, date: r.date ? new Date(r.date).toISOString() : '' })),
    };
    try {
      const { data } = editing ? await api.put(`/applications/${app._id}`, payload) : await api.post('/applications', payload);
      toast.success(editing ? 'Changes saved' : 'Application added');
      onSaved(data.application);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${app.company} – ${app.role}? This can't be undone.`)) return;
    try {
      await api.delete(`/applications/${app._id}`);
      toast.success('Application deleted');
      onDeleted(app._id);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  // ----- AI assistant -----
  const runAi = async (task) => {
    setAi({ loading: task, result: '' });
    try { localStorage.setItem('jt_background', background); } catch {}
    try {
      const { data } = await api.post('/ai', { task, company: form.company, role: form.role, jobDescription: form.jobDescription, background });
      setAi({ loading: '', result: data.result });
    } catch (err) {
      setAi({ loading: '', result: '' });
      toast.error(errMsg(err));
    }
  };
  const copy = () => navigator.clipboard.writeText(ai.result).then(() => toast.success('Copied'));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={save} className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-ink-900" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-ink-700">
          <h2 className="text-lg font-extrabold">{editing ? 'Edit application' : 'New application'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-ink-800" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-4 dark:border-ink-700">
          {['Details', 'Interviews', 'AI assistant'].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition ${tab === t ? 'border-teal-600 text-teal-700 dark:text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
              {t}{t === 'Interviews' && form.interviews.length ? ` (${form.interviews.length})` : ''}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {tab === 'Details' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company *"><input className="input" value={form.company} onChange={set('company')} required autoFocus /></Field>
                <Field label="Role *"><input className="input" value={form.role} onChange={set('role')} required /></Field>
                <Field label="Stage"><select className="input" value={form.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
                <Field label="Priority"><select className="input" value={form.priority} onChange={set('priority')}>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select></Field>
                <Field label="Salary"><input className="input" placeholder="e.g. ₹12 LPA" value={form.salary} onChange={set('salary')} /></Field>
                <Field label="Location"><input className="input" placeholder="Remote / Bengaluru" value={form.location} onChange={set('location')} /></Field>
                <Field label="Applied on"><input type="date" className="input" value={form.appliedDate} onChange={set('appliedDate')} /></Field>
                <Field label="Follow up on"><input type="date" className="input" value={form.followUpDate} onChange={set('followUpDate')} /></Field>
                <Field label="Job posting link" className="col-span-2"><input type="url" className="input" placeholder="https://" value={form.link} onChange={set('link')} /></Field>
                <Field label="Contact name"><input className="input" value={form.contactName} onChange={set('contactName')} /></Field>
                <Field label="Contact email"><input type="email" className="input" value={form.contactEmail} onChange={set('contactEmail')} /></Field>
                <Field label="Tags (comma separated)" className="col-span-2"><input className="input" placeholder="react, startup, referral" value={form.tags} onChange={set('tags')} /></Field>
                <Field label="Notes" className="col-span-2"><textarea rows={4} className="input resize-y" value={form.notes} onChange={set('notes')} /></Field>
              </div>

              {editing && history.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Stage history</h3>
                  <ul className="space-y-1.5 border-l border-slate-200 pl-4 dark:border-ink-700">
                    {history.map((h) => (
                      <li key={h._id} className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {h.from ? (<><Dot s={h.from} /> {h.from} <ArrowRight size={12} /> <Dot s={h.to} /> {h.to}</>) : (<>Added to <Dot s={h.to} /> {h.to}</>)}
                        <span className="ml-auto text-slate-400">{timeAgo(h.at)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {tab === 'Interviews' && (
            <>
              {form.interviews.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No interview rounds yet. Add one to see it on your calendar.</p>}
              {form.interviews.map((r, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-ink-700">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Round"><input className="input" value={r.round || ''} onChange={(e) => setRound(idx, 'round', e.target.value)} /></Field>
                    <Field label="Type">
                      <select className="input" value={r.type || 'Other'} onChange={(e) => setRound(idx, 'type', e.target.value)}>{INTERVIEW_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                    </Field>
                    <Field label="Date & time"><input type="datetime-local" className="input" value={r.date || ''} onChange={(e) => setRound(idx, 'date', e.target.value)} /></Field>
                    <Field label="Interviewer"><input className="input" value={r.interviewer || ''} onChange={(e) => setRound(idx, 'interviewer', e.target.value)} /></Field>
                  </div>
                  <Field label="Prep notes / feedback"><textarea rows={2} className="input resize-y" value={r.notes || ''} onChange={(e) => setRound(idx, 'notes', e.target.value)} /></Field>
                  <button type="button" onClick={() => delRound(idx)} className="text-xs font-semibold text-rose-600 hover:underline">Remove round</button>
                </div>
              ))}
              <button type="button" onClick={addRound} className="btn-ghost w-full"><Plus size={15} /> Add interview round</button>
            </>
          )}

          {tab === 'AI assistant' && (
            <>
              <Field label="Job description (paste it here, it is saved with the application)">
                <textarea rows={7} className="input resize-y" value={form.jobDescription} onChange={set('jobDescription')} placeholder="Paste the full job posting…" />
              </Field>
              <Field label="Your background (optional, remembered on this device)">
                <textarea rows={3} className="input resize-y" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="e.g. Final-year CS student, built MERN projects, React, Node, MongoDB…" />
              </Field>
              <div className="flex flex-wrap gap-2">
                {AI_TASKS.map((t) => (
                  <button key={t.id} type="button" className="btn-ghost" disabled={!!ai.loading} onClick={() => runAi(t.id)}>
                    {ai.loading === t.id ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-teal-600" />} {t.label}
                  </button>
                ))}
              </div>
              {ai.result && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-ink-700 dark:bg-ink-800">
                  <div className="mb-2 flex justify-end"><button type="button" onClick={copy} className="btn-ghost !px-2 !py-1 text-xs"><Copy size={13} /> Copy</button></div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{ai.result}</p>
                </div>
              )}
              <p className="text-xs text-slate-400">AI output can be wrong or generic. Always review and personalise it before sending.</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 dark:border-ink-700">
          {editing && <button type="button" onClick={remove} className="btn-ghost !text-rose-600"><Trash2 size={15} /> Delete</button>}
          <button type="button" onClick={onClose} className="btn-ghost ml-auto">Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} {editing ? 'Save changes' : 'Add application'}</button>
        </div>
      </form>
    </div>
  );
}
