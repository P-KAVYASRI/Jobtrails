import { useCallback, useEffect, useState } from 'react';
import { Loader2, Copy, Mail, Check, Ghost, Clock, CircleCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { fmtDate } from '../utils';

const LEVEL = {
  ok: { icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300', title: 'On track' },
  nudge: { icon: Clock, cls: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300', title: 'Time for a nudge' },
  ghosted: { icon: Ghost, cls: 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300', title: 'Likely ghosted' },
};
const STAGE_NAME = { first: 'First nudge', second: 'Second nudge', final: 'Closing-the-loop note' };

export default function FollowUpPanel({ app, onPatched }) {
  const [info, setInfo] = useState(null);
  const [draft, setDraft] = useState({ subject: '', body: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/applications/${app._id}/followup`);
      setInfo(data);
      if (data.draft) setDraft({ subject: data.draft.subject, body: data.draft.body });
    } catch (err) {
      toast.error(errMsg(err));
    }
  }, [app._id]);
  useEffect(() => { load(); }, [load]);

  if (!info) return <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-teal-600" /></div>;
  if (!info.ghost) return <p className="py-8 text-center text-sm text-slate-400">This application is finished, so there is nothing to follow up on.</p>;

  const lvl = LEVEL[info.ghost.level];
  const Icon = lvl.icon;
  const copy = () => navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`).then(() => toast.success('Copied'));
  const mailto = `mailto:${app.contactEmail || ''}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;

  const markSent = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/applications/${app._id}/followup/sent`);
      toast.success('Logged. Next check-in set for 7 days from now.');
      onPatched?.(data.application);
      await load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={`flex items-start gap-3 rounded-xl p-3 ${lvl.cls}`}>
        <Icon size={20} className="mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-extrabold">{lvl.title} · {info.ghost.daysQuiet} day{info.ghost.daysQuiet === 1 ? '' : 's'} of silence</p>
          <p className="opacity-80">
            {info.ghost.level === 'ok'
              ? `Normal for the ${app.status} stage. A nudge makes sense if it stays quiet a few more days.`
              : `Usually a reply comes sooner at the ${app.status} stage.`}
            {info.lastNudgedAt && ` You last followed up on ${fmtDate(info.lastNudgedAt)} (${info.nudgeCount}×).`}
          </p>
        </div>
      </div>

      {info.draft && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">Suggested message · {STAGE_NAME[info.draft.stage]}</h3>
          </div>
          <input className="input" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} aria-label="Email subject" />
          <textarea rows={11} className="input resize-y leading-relaxed" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} aria-label="Email body" />
          <p className="rounded-lg bg-slate-100 p-2.5 text-xs text-slate-600 dark:bg-ink-800 dark:text-slate-300">💡 {info.draft.tip}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={copy}><Copy size={14} /> Copy</button>
            <a className="btn-ghost" href={mailto}><Mail size={14} /> Open in email</a>
            <button type="button" className="btn-primary ml-auto" onClick={markSent} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} I sent it
            </button>
          </div>
          {!app.contactEmail && <p className="text-xs text-slate-400">Tip: add a contact email on the Details tab and “Open in email” fills it in for you.</p>}
        </>
      )}
    </>
  );
}
