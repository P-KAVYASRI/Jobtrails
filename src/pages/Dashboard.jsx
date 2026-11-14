import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { BellRing, Briefcase, Gauge, Trophy, Send, CalendarClock, Ghost, Target, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { STATUSES, STATUS_STYLE } from '../constants';
import { followUpState, FOLLOW_STYLE, timeAgo, fmtDateTime, GHOST_STYLE } from '../utils';

const tip = { contentStyle: { background: '#0f172a', border: 0, borderRadius: 8, color: '#fff', fontSize: 12, padding: '6px 10px' }, itemStyle: { color: '#fff' }, cursor: { fill: '#94a3b81a' } };

const Stat = ({ icon: Icon, label, value, hint }) => (
  <div className="bg-white px-4 py-4 dark:bg-ink-900">
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><Icon size={13} /> {label}</div>
    <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
    <div className="mt-0.5 text-xs text-slate-400">{hint}</div>
  </div>
);

// one consistent panel: title row with an optional icon, then content
const Panel = ({ title, icon: Icon, hint, className = '', children }) => (
  <section className={`panel p-4 ${className}`}>
    <h3 className="flex items-center gap-2 text-sm font-semibold">{Icon && <Icon size={15} className="text-slate-400" />}{title}</h3>
    {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

const SectionTitle = ({ title, text }) => (
  <div className="pt-2">
    <h2 className="text-base font-semibold">{title}</h2>
    <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>
  </div>
);

export default function Dashboard() {
  const [s, setS] = useState(null);

  useEffect(() => {
    api.get('/stats').then((r) => setS(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  if (!s) return <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/70 dark:bg-ink-800" />)}</div>;

  const pie = STATUSES.map((st) => ({ name: st, value: s.counts[st] })).filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Insights</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">How your search is going and what to do next.</p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-sm dark:border-ink-700 dark:bg-ink-700 lg:grid-cols-4">
        <Stat icon={Send} label="Total applied" value={s.total} hint="all time" />
        <Stat icon={Briefcase} label="In progress" value={s.active} hint="applied, screening, interview" />
        <Stat icon={Gauge} label="Response rate" value={`${s.responseRate}%`} hint="moved past Applied" />
        <Stat icon={Trophy} label="Offer rate" value={`${s.offerRate}%`} hint={`${s.counts.Offer} offer(s)`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Applications per week" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={s.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip {...tip} />
                <Bar dataKey="count" name="Applications" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Where everything stands">
          {pie.length === 0 ? <Empty /> : (
            <>
              <div className="h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="none">
                      {pie.map((d) => <Cell key={d.name} fill={STATUS_STYLE[d.name].hex} />)}
                    </Pie>
                    <Tooltip {...tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {pie.map((d) => (
                  <span key={d.name} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${STATUS_STYLE[d.name].dot}`} />{d.name} {d.value}</span>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      <SectionTitle title="What to act on" text="Quiet applications, how well your resume fits, and the skills worth learning." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Ghost radar" icon={Ghost}
          hint={s.ghostTotal ? `${s.ghostTotal} application${s.ghostTotal > 1 ? 's are' : ' is'} quieter than normal for their stage.` : 'Applications that go quiet for too long show up here.'}>
          {s.ghosts.length === 0 ? <Empty text="Nobody is ghosting you right now." /> : (
            <ul className="space-y-2">
              {s.ghosts.map((g) => (
                <li key={g._id}>
                  <Link to={`/board?open=${g._id}&tab=followup`} className="flex items-center justify-between gap-2 rounded-lg p-1.5 text-sm transition hover:bg-slate-100 dark:hover:bg-ink-800">
                    <span className="min-w-0 truncate"><b>{g.company}</b> <span className="text-slate-400">{g.status}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${GHOST_STYLE[g.level]}`}>{g.daysQuiet}d quiet</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Does a better match get more replies?" icon={Target}
          hint={s.matchInsight.scored ? `Average match ${s.matchInsight.avgScore}% across ${s.matchInsight.scored} scored applications.` : 'Reply rate by resume-match band.'}>
          {s.matchInsight.scored === 0 ? <Empty text="No match scores yet." /> : (
            <div className="h-40">
              <ResponsiveContainer>
                <BarChart data={s.matchInsight.bands}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                  <XAxis dataKey="band" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip {...tip} formatter={(v, _n, { payload }) => [`${v}% (${payload.replied} of ${payload.total})`, 'Replied']} />
                  <Bar dataKey="rate" name="Reply rate" radius={[6, 6, 0, 0]}>
                    {s.matchInsight.bands.map((b) => <Cell key={b.band} fill={b.band === 'High' ? '#10b981' : b.band === 'Medium' ? '#f59e0b' : '#f43f5e'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 rounded-lg bg-slate-100 p-2.5 text-xs text-slate-600 dark:bg-ink-800 dark:text-slate-300">{s.matchInsight.message}</p>
        </Panel>

        <Panel title="Skills to learn next" icon={Wrench} hint="Skills that jobs asked for and your resume did not mention.">
          {s.skillGaps.length === 0 ? <Empty text="Save your resume and add job descriptions to see your skill gaps." /> : (
            <ul className="space-y-2">
              {s.skillGaps.map((k) => (
                <li key={k.skill} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate font-semibold">{k.skill}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-ink-700">
                    <span className="block h-full rounded-full bg-violet-500" style={{ width: `${Math.round((k.count / s.skillGaps[0].count) * 100)}%` }} />
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs text-slate-400">{k.count} job{k.count > 1 ? 's' : ''}</span>
                </li>
              ))}
            </ul>
          )}
          {s.skillGaps.length === 0 && <Link to="/settings#resume" className="mt-2 block text-center text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300">Add your resume →</Link>}
        </Panel>
      </div>

      <SectionTitle title="Pipeline" text="Where applications wait, and what is coming up." />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Panel title="Average days in current stage" hint="Longer bars show where applications sit the longest.">
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={s.stages} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="status" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
                <Tooltip {...tip} />
                <Bar dataKey="days" name="Days" radius={[0, 6, 6, 0]}>
                  {s.stages.map((d) => <Cell key={d.status} fill={STATUS_STYLE[d.status].hex} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Upcoming interviews" icon={CalendarClock}>
          {s.interviews.length === 0 ? <Empty text="No interviews scheduled." /> : (
            <ul className="space-y-2.5">
              {s.interviews.map((i, n) => (
                <li key={n} className="text-sm">
                  <b>{i.company}</b> <span className="text-slate-400">{i.type}</span>
                  <div className="text-xs text-slate-500">{fmtDateTime(i.date)}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming follow-ups" icon={BellRing}>
          {s.followUps.length === 0 ? <Empty text="No follow-ups scheduled." /> : (
            <ul className="space-y-2">
              {s.followUps.map((f) => {
                const st = followUpState(f);
                return (
                  <li key={f._id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate"><b>{f.company}</b> <span className="text-slate-400">{f.role}</span></span>
                    {st && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${FOLLOW_STYLE[st.tone]}`}>{st.text.replace('Follow-up ', '').replace('Follow up ', '')}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity">
          {s.recent.length === 0 ? <Empty text="Nothing yet." /> : (
            <ul className="space-y-2.5">
              {s.recent.map((a) => (
                <li key={a._id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    <b>{a.company}</b> <span className="text-slate-400">{a.from ? `${a.from} → ${a.to}` : `added to ${a.to}`}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

const Empty = ({ text = 'Add applications to see this chart.' }) => <p className="py-8 text-center text-sm text-slate-400">{text}</p>;
