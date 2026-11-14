import { Link, NavLink, Outlet } from 'react-router-dom';
import { Compass, LayoutDashboard, Kanban, Moon, Sun, LogOut, CalendarDays, Settings as Cog } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const link = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-teal-600/10 text-teal-700 dark:text-teal-300'
      : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-ink-800'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-ink-700 dark:bg-ink-950/80">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <Compass className="text-teal-600" size={22} /> Jobtrail
          </Link>
          <nav className="ml-4 flex gap-1">
            <NavLink to="/board" className={link}><Kanban size={16} /> <span className="hidden sm:inline">Board</span></NavLink>
            <NavLink to="/calendar" className={link}><CalendarDays size={16} /> <span className="hidden sm:inline">Calendar</span></NavLink>
            <NavLink to="/dashboard" className={link}><LayoutDashboard size={16} /> <span className="hidden sm:inline">Insights</span></NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NavLink to="/settings" className="hidden text-sm text-slate-500 hover:text-teal-600 sm:block dark:text-slate-400">{user?.name}</NavLink>
            <NavLink to="/settings" className="btn-ghost !p-2" aria-label="Settings"><Cog size={16} /></NavLink>
            <button onClick={toggle} className="btn-ghost !p-2" aria-label="Toggle dark mode">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={logout} className="btn-ghost !p-2" aria-label="Log out"><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
