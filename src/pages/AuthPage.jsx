import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isLogin) await login({ email: form.email, password: form.password });
      else await register(form);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold"><Compass className="text-teal-400" /> Jobtrail</Link>
        <div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">Every application, one clear trail.</h1>
          <p className="mt-4 max-w-sm text-slate-400">
            Drag roles from Applied to Offer, get nudged when a follow-up is due, and see which stage is slowing you down.
          </p>
          <div className="mt-10 flex gap-3">
            {['Applied', 'Screening', 'Interview', 'Offer'].map((s, i) => (
              <div key={s} className="w-24 rounded-lg border border-white/10 bg-white/5 p-2" style={{ transform: `translateY(${i * -8}px)` }}>
                <div className="mb-2 text-[11px] font-semibold text-slate-300">{s}</div>
                {Array.from({ length: 3 - (i % 3) }).map((_, j) => (
                  <div key={j} className="mb-1.5 h-6 rounded bg-white/10" />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">Built with React, Express and MongoDB.</p>
      </aside>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="text-2xl font-extrabold">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
            <p className="mt-1 text-sm text-slate-500">{isLogin ? 'Log in to see your board.' : 'Start tracking in under a minute.'}</p>
          </div>
          {!isLogin && (
            <label className="block text-sm font-semibold">Name
              <input className="input mt-1" value={form.name} onChange={set('name')} required autoComplete="name" />
            </label>
          )}
          <label className="block text-sm font-semibold">Email
            <input type="email" className="input mt-1" value={form.email} onChange={set('email')} required autoComplete="email" />
          </label>
          <label className="block text-sm font-semibold">Password
            <input type="password" className="input mt-1" value={form.password} onChange={set('password')} required minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'} />
          </label>
          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />} {isLogin ? 'Log in' : 'Create account'}
          </button>
          <p className="text-center text-sm text-slate-500">
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <Link className="font-semibold text-teal-600 hover:underline" to={isLogin ? '/register' : '/login'}>
              {isLogin ? 'Create an account' : 'Log in'}
            </Link>
          </p>
          <p className="text-center text-sm"><Link to="/" className="text-slate-400 hover:text-teal-600">← Back to home</Link></p>
        </form>
      </section>
    </div>
  );
}
