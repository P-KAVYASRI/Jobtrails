import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ScanSearch, CheckCircle2, CircleAlert, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import MatchRing from './MatchRing.jsx';

const BAND_TEXT = {
  High: 'Strong match. Apply with confidence and tailor your summary.',
  Medium: 'Decent match. Close the gaps below before you apply.',
  Low: 'Weak match. Apply only if you can show real evidence for the missing skills.',
};

export default function MatchPanel({ jobDescription, onChange }) {
  const [state, setState] = useState({ loading: false, data: null });
  const ready = jobDescription.trim().length >= 30;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const { data } = await api.post('/match', { jobDescription });
      setState({ loading: false, data });
    } catch (err) {
      setState({ loading: false, data: null });
      toast.error(errMsg(err));
    }
  }, [jobDescription]);

  useEffect(() => { if (ready) run(); /* analyse once when the tab opens */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading } = state;

  return (
    <>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
        Job description
        <textarea rows={6} className="input mt-1 resize-y font-normal" value={jobDescription} onChange={onChange} placeholder="Paste the full job posting, including the requirements section…" />
      </label>
      <button type="button" className="btn-primary w-full" disabled={!ready || loading} onClick={run}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={16} />} {data ? 'Re-analyse match' : 'Analyse match with my resume'}
      </button>

      {data && !data.hasResume && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 font-semibold"><FileText size={15} /> Add your resume first</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Save your resume text once in Settings and every job gets a match score automatically.</p>
          <Link to="/settings#resume" className="mt-2 inline-block font-semibold text-teal-700 hover:underline dark:text-teal-300">Open Settings →</Link>
        </div>
      )}

      {data && data.hasResume && data.score == null && data.reason === 'jd' && (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-ink-800 dark:text-slate-300">
          Only {data.jobSkills} known skill{data.jobSkills === 1 ? '' : 's'} found in this text. Paste the full requirements section to get a reliable score.
        </p>
      )}

      {data && data.score != null && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-3 dark:border-ink-700">
            <MatchRing score={data.score} />
            <div>
              <p className="font-extrabold">{data.band} match</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{BAND_TEXT[data.band]}</p>
              <p className="mt-1 text-xs text-slate-400">{data.matched.length} of {data.jobSkills} skills the job asks for are on your resume.</p>
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"><CheckCircle2 size={14} className="text-emerald-500" /> You have</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.matched.length ? data.matched.map((k) => <span key={k} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{k}</span>) : <span className="text-xs text-slate-400">Nothing yet</span>}
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"><CircleAlert size={14} className="text-rose-500" /> Missing from your resume</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.missing.length ? data.missing.map((k) => <span key={k} className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{k}</span>) : <span className="text-xs text-slate-400">No gaps found 🎉</span>}
            </div>
            {data.missing.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">If you genuinely have {data.missing.slice(0, 2).join(' or ')}, add it to your resume with a real project. If not, it is your next thing to learn.</p>
            )}
          </div>
        </div>
      )}

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer font-semibold">How is this score calculated?</summary>
        <p className="mt-2 leading-relaxed">
          Jobtrail scans the job description for ~110 known skills and understands variants (“nodejs”, “Node.js”, “node”). Skills the posting stresses (repeated, or marked required or must-have) count more than “nice to have” ones. Your score is the weighted share of those skills found on your resume. It runs on your own server with no paid AI, so it is instant, free and explainable.
        </p>
      </details>
    </>
  );
}
