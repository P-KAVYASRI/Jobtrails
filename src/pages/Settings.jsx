import { useEffect, useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [delPw, setDelPw] = useState('');
  const [busy, setBusy] = useState('');
  const [resume, setResume] = useState('');
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    api.get('/resume').then((r) => { setResume(r.data.resume); setSkills(r.data.skills); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (window.location.hash === '#resume') document.getElementById('resume')?.scrollIntoView({ block: 'center' });
  }, []);

  const saveResume = (e) => {
    e.preventDefault();
    run('resume', async () => {
      const { data } = await api.put('/resume', { resume });
      setSkills(data.skills);
      toast.success(data.rescored ? `Resume saved. ${data.rescored} application${data.rescored > 1 ? 's' : ''} re-scored.` : 'Resume saved');
    });
  };

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };

  const saveProfile = (e) => {
    e.preventDefault();
    run('profile', async () => {
      const { data } = await api.patch('/auth/profile', { name });
      updateUser(data.user);
      toast.success('Profile updated');
    });
  };

  const toggleReminders = () =>
    run('rem', async () => {
      const { data } = await api.patch('/auth/profile', { remindersEnabled: !user.remindersEnabled });
      updateUser(data.user);
      toast.success(data.user.remindersEnabled ? 'Email reminders on' : 'Email reminders off');
    });

  const changePassword = (e) => {
    e.preventDefault();
    run('pw', async () => {
      await api.post('/auth/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    });
  };

  const deleteAccount = (e) => {
    e.preventDefault();
    if (!window.confirm('Delete your account and ALL applications? This cannot be undone.')) return;
    run('del', async () => {
      await api.delete('/auth/account', { data: { password: delPw } });
      toast.success('Account deleted');
      logout();
    });
  };

  const Spin = ({ k }) => busy === k && <Loader2 size={15} className="animate-spin" />;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-extrabold">Settings</h1>

      <form onSubmit={saveProfile} className="panel space-y-3 p-5">
        <h2 className="font-bold">Profile</h2>
        <label className="block text-sm font-semibold">Name
          <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
        </label>
        <p className="text-sm text-slate-500">Email: {user.email}</p>
        <button className="btn-primary" disabled={busy === 'profile'}><Spin k="profile" /> Save profile</button>
      </form>

      <form id="resume" onSubmit={saveResume} className="panel space-y-3 scroll-mt-24 p-5">
        <h2 className="flex items-center gap-2 font-bold"><FileText size={17} className="text-teal-600" /> Resume</h2>
        <p className="text-sm text-slate-500">Paste your resume as plain text. Jobtrail uses it to score how well each job matches you. It is only used for your own match scores and AI drafts.</p>
        <textarea rows={10} className="input resize-y" maxLength={12000} value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste your resume text here: skills, projects, experience…" />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{resume.length.toLocaleString()} / 12,000</span>
          <span>{skills.length ? `${skills.length} skills detected` : 'No skills detected yet'}</span>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((k) => <span key={k} className="rounded-full bg-teal-600/10 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">{k}</span>)}
          </div>
        )}
        <button className="btn-primary" disabled={busy === 'resume'}><Spin k="resume" /> Save resume</button>
      </form>

      <div className="panel flex items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-bold">Email reminders</h2>
          <p className="text-sm text-slate-500">A daily email when a follow-up is due or an interview is coming up.</p>
        </div>
        <button onClick={toggleReminders} role="switch" aria-checked={user.remindersEnabled}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${user.remindersEnabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-ink-700'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${user.remindersEnabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      <form onSubmit={changePassword} className="panel space-y-3 p-5">
        <h2 className="font-bold">Change password</h2>
        <input type="password" className="input" placeholder="Current password" autoComplete="current-password" required
          value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
        <input type="password" className="input" placeholder="New password (min 6 characters)" autoComplete="new-password" required minLength={6}
          value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
        <button className="btn-primary" disabled={busy === 'pw'}><Spin k="pw" /> Update password</button>
      </form>

      <form onSubmit={deleteAccount} className="panel space-y-3 border-rose-300 p-5 dark:border-rose-500/40">
        <h2 className="font-bold text-rose-600">Delete account</h2>
        <p className="text-sm text-slate-500">Permanently removes your account and every application.</p>
        <input type="password" className="input" placeholder="Enter your password to confirm" required
          value={delPw} onChange={(e) => setDelPw(e.target.value)} />
        <button className="btn bg-rose-600 text-white hover:bg-rose-700" disabled={busy === 'del'}><Spin k="del" /> Delete my account</button>
      </form>
    </div>
  );
}
