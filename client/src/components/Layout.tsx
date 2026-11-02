import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useAuth } from '../context/AuthContext';
import {
  IconAbout,
  IconDashboard,
  IconFirms,
  IconLogout,
  IconMap,
} from './icons/NavIcons';

const links = [
  { to: '/', label: 'Home', end: true, Icon: IconDashboard },
  { to: '/firms', label: 'Firms', Icon: IconFirms },
  { to: '/map', label: 'Maps', Icon: IconMap },
  { to: '/about', label: 'About', Icon: IconAbout },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = (user?.username ?? 'U').slice(0, 2).toUpperCase();

  return (
    <div className="dost-app flex min-h-screen flex-col">
      <div className="dost-app-bg" aria-hidden />

      <header className="dost-topbar sticky top-0 z-50">
        <div className="dost-topbar-inner mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 lg:px-8">
          <NavLink to="/" className="flex shrink-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="DOST"
              className="h-11 w-11 rounded-xl bg-white p-1 shadow-sm ring-1 ring-white/20"
            />
            <div className="hidden sm:block">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100/90">
                Department of Science and Technology
              </p>
              <p className="font-display text-sm font-bold leading-tight text-white">
                PSTO Cagayan · Region II
              </p>
            </div>
          </NavLink>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {links.map(({ to, label, end, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'dost-nav-link flex items-center gap-2 rounded-xl px-3.5 py-2 transition-colors',
                    isActive
                      ? 'bg-white text-[var(--dost-primary)] shadow-md shadow-black/10'
                      : 'text-blue-50 hover:bg-white/12 hover:text-white'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:ml-2 md:gap-3">
            <div className="hidden text-right lg:block">
              <p className="text-sm font-semibold text-white">{user?.username}</p>
              <p className="text-[11px] text-blue-100/85">
                {user?.role === 'superadmin' ? 'Super Admin' : 'Staff'}
              </p>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/12 font-display text-sm font-bold text-white backdrop-blur-sm"
              title={user?.username}
            >
              {initials}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-xl border border-white/25 px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10 sm:inline-flex"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="dost-main flex-1">
        <Outlet />
      </main>

      <nav className="dost-mobile-nav fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-white/10 bg-[var(--dost-primary-dark)] px-2 py-2 md:hidden">
        {links.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'font-display flex flex-col items-center rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide',
                isActive ? 'bg-white/15 text-white' : 'text-blue-100/90'
              )
            }
          >
            <Icon className="mb-0.5 h-5 w-5" />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="font-display flex flex-col items-center rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-100/90"
        >
          <IconLogout className="mb-0.5 h-5 w-5" />
          Exit
        </button>
      </nav>
    </div>
  );
}
