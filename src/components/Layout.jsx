import { Link, NavLink, Outlet } from 'react-router-dom';
import { Compass, LayoutDashboard, Kanban, Moon, Sun, LogOut, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const link = ({ isActive }) =>
  `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition ${
    isActive
      ? 'bg-slate-100 text-slate-900 dark:bg-ink-800 dark:text-white'
      : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-ink-800/70 dark:hover:text-slate-100'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-ink-700 dark:bg-ink-950/85">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-4">
          <Link to="/" className="mr-3 flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-teal-600 text-white"><Compass size={15} /></span>
            Jobtrail
          </Link>
          <nav className="flex gap-0.5" aria-label="Main">
            <NavLink to="/board" className={link}><Kanban size={15} /> <span className="hidden sm:inline">Board</span></NavLink>
            <NavLink to="/calendar" className={link}><CalendarDays size={15} /> <span className="hidden sm:inline">Calendar</span></NavLink>
            <NavLink to="/dashboard" className={link}><LayoutDashboard size={15} /> <span className="hidden sm:inline">Insights</span></NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggle} className="btn-icon" aria-label="Toggle dark mode">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={logout} className="btn-icon" aria-label="Log out"><LogOut size={16} /></button>
            <NavLink to="/settings" aria-label="Settings and resume" title={user?.name}
              className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-teal-600/10 text-sm font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/20 transition hover:bg-teal-600/20 dark:text-teal-300">
              {initial}
            </NavLink>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
