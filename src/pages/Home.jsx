import { Link } from 'react-router-dom';
import {
  Compass, Kanban, BellRing, CalendarDays, LineChart, Sparkles, ShieldCheck,
  Moon, Sun, ArrowRight, CalendarClock, MapPin, Target, Ghost, Wrench, FileQuestion,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const FEATURES = [
  { icon: Kanban, title: 'Drag-and-drop board', text: 'Move every role from Applied to Offer in one smooth gesture. Your order is saved automatically.' },
  { icon: BellRing, title: 'Follow-up reminders', text: 'Cards turn amber, then red, when a follow-up is due, and an optional daily email keeps you on track.' },
  { icon: CalendarDays, title: 'Interview calendar', text: 'Log every round with date, interviewer and prep notes, then see it all on a monthly calendar.' },
  { icon: LineChart, title: 'Insights that matter', text: 'Weekly activity, response rate, offer rate and the stage where applications stall the longest.' },
  { icon: Sparkles, title: 'AI interview prep', text: 'Paste a job description and get a cover letter draft, likely questions and a skills match.' },
  { icon: Target, title: 'Resume match score', text: 'Save your resume once. Every job gets a match score with the exact skills you have and the ones you are missing. No paid AI involved.' },
  { icon: Ghost, title: 'Ghost detector', text: 'Jobtrail notices when an application goes quiet for longer than normal for its stage, and flags it before you forget.' },
  { icon: Wrench, title: 'Skill-gap insights', text: 'See which skills keep showing up in jobs you apply to but not on your resume, so you know what to learn next.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Hashed passwords, token-based sessions and rate-limited logins. Only you can see your data.' },
];

const PROBLEMS = [
  { icon: FileQuestion, bad: 'Applying blindly', good: 'Know your fit before you apply', text: 'A resume-to-job match score shows which required skills you already have and which are missing.' },
  { icon: Ghost, bad: 'Being ghosted', good: 'Follow up at the right time', text: 'Quiet applications are flagged automatically and the follow-up coach drafts the email for you.' },
  { icon: LineChart, bad: 'Never learning what works', good: 'See what actually gets replies', text: 'Insights compare reply rates for strong and weak matches, and rank the skills you should learn next.' },
];

const STEPS = [
  { n: '1', title: 'Add what you applied to', text: 'Company, role, salary, link and notes, in under 20 seconds per job.' },
  { n: '2', title: 'Check your fit and follow up', text: 'Get a match score for each job, drag cards across stages and send the drafted follow-up when one goes quiet.' },
  { n: '3', title: 'Learn what is working', text: 'Check match scores, ghosted applications and skill gaps, then double down on what gets replies.' },
];

const MiniCard = ({ company, role, tone, children, className = '' }) => (
  <div className={`rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm dark:border-ink-700 dark:bg-ink-800 ${className}`}>
    <p className="truncate text-[13px] font-bold">{company}</p>
    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{role}</p>
    {children}
    {tone && <span className={`mt-2 block h-1 w-8 rounded-full ${tone}`} />}
  </div>
);

function BoardPreview() {
  const Col = ({ title, dot, children }) => (
    <div className="w-1/3 min-w-0 rounded-lg bg-slate-100/80 p-2 dark:bg-ink-900">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold">
        <span className={`h-2 w-2 rounded-full ${dot}`} /> {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-teal-500/10 blur-2xl" aria-hidden />
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-ink-700 dark:bg-ink-900" aria-hidden>
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 text-[11px] font-semibold text-slate-400">Your board</span>
        </div>
        <div className="flex gap-2">
          <Col title="Applied" dot="bg-sky-500">
            <MiniCard company="Northwind Labs" role="Frontend Developer" tone="bg-sky-500">
              <span className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400"><MapPin size={10} /> Bengaluru</span>
              <span className="mt-1.5 flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Target size={10} /> 82% match</span>
            </MiniCard>
            <MiniCard company="Brightpath" role="React Engineer" tone="bg-sky-500">
              <span className="mt-1.5 flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"><Ghost size={10} /> Quiet for 9d</span>
            </MiniCard>
          </Col>
          <Col title="Interview" dot="bg-amber-500">
            <MiniCard company="Paperplane" role="Full-stack Intern" tone="bg-amber-500" className="float">
              <span className="mt-1.5 flex items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><CalendarClock size={10} /> Tue, 10:30</span>
            </MiniCard>
          </Col>
          <Col title="Offer" dot="bg-emerald-500">
            <MiniCard company="Kitebridge" role="Junior Developer" tone="bg-emerald-500" className="float-delay">
              <span className="mt-1.5 block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Offer received</span>
            </MiniCard>
          </Col>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();

  const primary = user
    ? { to: '/board', label: 'Open your board' }
    : { to: '/register', label: 'Get started free' };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-ink-700 dark:bg-ink-950/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight"><Compass className="text-teal-600" size={22} /> Jobtrail</Link>
          <nav className="ml-6 hidden gap-1 text-sm font-semibold text-slate-600 sm:flex dark:text-slate-400">
            <a href="#features" className="rounded-lg px-3 py-1.5 hover:bg-slate-200/60 dark:hover:bg-ink-800">Features</a>
            <a href="#how" className="rounded-lg px-3 py-1.5 hover:bg-slate-200/60 dark:hover:bg-ink-800">How it works</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} className="btn-ghost !p-2" aria-label="Toggle dark mode">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            {!user && <Link to="/login" className="btn-ghost">Log in</Link>}
            <Link to={primary.to} className="btn-primary">{user ? 'Open board' : 'Sign up'}</Link>
          </div>
        </div>
      </header>

      <section className="hero-bg">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-600/20 bg-teal-600/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <Sparkles size={13} /> Built for job seekers
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Stop losing track of your <span className="text-teal-600 dark:text-teal-400">job search.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600 dark:text-slate-400">
              Jobtrail keeps every application, interview and follow-up in one place, so you always know what to do next.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={primary.to} className="btn-primary !px-5 !py-3 !text-base">{primary.label} <ArrowRight size={18} /></Link>
              {!user && <Link to="/login" className="btn-ghost !px-5 !py-3 !text-base">Log in</Link>}
            </div>
            <p className="mt-4 text-sm text-slate-500">Free to use. No credit card.</p>
          </div>
          <BoardPreview />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14 dark:border-ink-700 dark:bg-ink-900">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight">Job searching has three big problems</h2>
          <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">Most trackers only store your applications. Jobtrail also helps you act on them.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map(({ icon: Icon, bad, good, text }) => (
              <div key={bad} className="rounded-xl border border-slate-200 p-5 dark:border-ink-700">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-teal-600/10 text-teal-600 dark:text-teal-400"><Icon size={20} /></div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-500 line-through decoration-rose-400/60">{bad}</p>
                <h3 className="mt-1 font-extrabold">{good}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight">Everything your job hunt needs</h2>
        <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">No spreadsheets, no sticky notes, no missed follow-ups.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="panel p-5 transition hover:-translate-y-0.5 hover:border-teal-400 dark:hover:border-teal-500/60">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-teal-600/10 text-teal-600 dark:text-teal-400"><Icon size={20} /></div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-y border-slate-200 bg-white py-16 dark:border-ink-700 dark:bg-ink-900">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-600 font-extrabold text-white">{s.n}</div>
                <div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-ink-900 px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Ready to take control of your search?</h2>
          <p className="mx-auto mt-3 max-w-md text-slate-400">Set up takes a minute. Add your first application today.</p>
          <Link to={primary.to} className="btn-primary mt-7 !px-6 !py-3 !text-base">{primary.label} <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-ink-700">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4">
          <span className="flex items-center gap-2 font-semibold"><Compass size={16} className="text-teal-600" /> Jobtrail</span>
          <span>Built with React, Express and MongoDB.</span>
        </div>
      </footer>
    </div>
  );
}
