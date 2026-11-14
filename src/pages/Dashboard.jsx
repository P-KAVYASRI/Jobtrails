import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BellRing, Briefcase, Gauge, Trophy, Send, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { STATUSES, STATUS_STYLE } from '../constants';
import { followUpState, FOLLOW_STYLE, timeAgo, fmtDateTime } from '../utils';

const tip = { contentStyle: { background: '#0f172a', border: 0, borderRadius: 8, color: '#fff', fontSize: 12 }, itemStyle: { color: '#fff' }, cursor: { fill: '#94a3b822' } };

const Stat = ({ icon: Icon, label, value, hint }) => (
  <div className="panel p-4">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400"><Icon size={16} className="text-teal-600" /> {label}</div>
    <div className="mt-2 text-3xl font-extrabold">{value}</div>
    <div className="text-xs text-slate-400">{hint}</div>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Send} label="Total applied" value={s.total} hint="all time" />
        <Stat icon={Briefcase} label="In progress" value={s.active} hint="applied, screening, interview" />
        <Stat icon={Gauge} label="Response rate" value={`${s.responseRate}%`} hint="moved past Applied" />
        <Stat icon={Trophy} label="Offer rate" value={`${s.offerRate}%`} hint={`${s.counts.Offer} offer(s)`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-4 lg:col-span-2">
          <h3 className="mb-3 font-bold">Applications per week</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={s.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip {...tip} />
                <Bar dataKey="count" name="Applications" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-4">
          <h3 className="mb-3 font-bold">Where everything stands</h3>
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
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-4">
          <h3 className="mb-1 font-bold">Average days in current stage</h3>
          <p className="mb-3 text-xs text-slate-400">Longer bars show where applications sit the longest.</p>
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
        </div>

        <div className="panel p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><CalendarClock size={16} className="text-violet-500" /> Upcoming interviews</h3>
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
        </div>

        <div className="panel p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><BellRing size={16} className="text-amber-500" /> Upcoming follow-ups</h3>
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
        </div>

        <div className="panel p-4">
          <h3 className="mb-3 font-bold">Recent activity</h3>
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
        </div>
      </div>
    </div>
  );
}

const Empty = ({ text = 'Add applications to see this chart.' }) => <p className="py-8 text-center text-sm text-slate-400">{text}</p>;
