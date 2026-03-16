import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import {
  LayoutDashboard, Users, CalendarDays, BookOpen, Wallet,
  LogOut, ChevronLeft, ChevronRight, Menu,
} from 'lucide-react';
import churchLogo from '../../assets/st-francis-logo.jpg';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/members', label: 'Members', icon: Users },
  { path: '/events', label: 'Events', icon: CalendarDays },
  { path: '/sacraments', label: 'Sacraments', icon: BookOpen },
  { path: '/finance', label: 'Finance', icon: Wallet },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { config } = useAppConfig();
  const logoSrc = config.logo_url || churchLogo;
  const shortName = config.church_code || config.name;
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ── */}
      <aside className={`
        relative flex flex-col flex-shrink-0
        bg-gradient-to-b from-navy-dark via-navy to-navy-dark
        transition-all duration-300 ease-in-out
        ${open ? 'w-64' : 'w-16'}
      `}>
        {/* Gold accent line top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-olive to-transparent" />

        {/* Dot pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(184,150,62,0.09) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        {/* Ambient glow */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-32 h-32 bg-olive/10 blur-3xl rounded-full pointer-events-none" />

        {/* Logo */}
        <div className={`relative flex items-center gap-3 border-b border-white/5 py-5 transition-all ${open ? 'px-5' : 'px-4 justify-center'}`}>
          <div className="w-9 h-9 flex-shrink-0 rounded-xl overflow-hidden border border-olive/30 shadow-lg shadow-olive/20">
            <img src={logoSrc} alt={shortName} className="w-full h-full object-cover" />
          </div>
          {open && (
            <div className="overflow-hidden">
              <p className="text-olive font-bold tracking-widest uppercase text-xs leading-tight">{shortName}</p>
              <p className="text-white/30 text-[10px] tracking-wide leading-tight mt-0.5">{config.name}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, icon: Icon, exact }) => {
            const active = isActive(path, exact);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={!open ? label : undefined}
                className={`
                  w-full flex items-center rounded-lg transition-all duration-150 text-sm
                  ${open ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5'}
                  ${active
                    ? 'bg-gradient-to-r from-olive/25 to-olive/5 text-olive border border-olive/25 shadow-sm shadow-olive/10'
                    : 'text-white/40 hover:text-white/75 hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'drop-shadow-sm' : ''}`} />
                {open && (
                  <>
                    <span className="font-medium truncate flex-1 text-left">{label}</span>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-olive shrink-0" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* User row */}
        <div className="relative border-t border-white/5">
          {open ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-olive/20 border border-olive/30 flex items-center justify-center flex-shrink-0">
                <span className="text-olive text-xs font-bold">{user?.full_name?.charAt(0) ?? 'A'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs font-medium truncate">{user?.full_name ?? 'Admin'}</p>
                <p className="text-white/30 text-[10px] capitalize truncate">{user?.role ?? 'admin'}</p>
              </div>
              <button onClick={handleLogout} title="Logout"
                className="text-white/30 hover:text-white/70 transition-colors p-1 rounded">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center py-3">
              <button onClick={handleLogout} title="Logout"
                className="text-white/30 hover:text-white/70 transition-colors p-1">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setOpen(o => !o)}
            className={`w-full flex items-center gap-2 py-2.5 border-t border-white/5 text-white/20 hover:text-white/50 transition-colors text-xs ${open ? 'px-4' : 'justify-center px-0'}`}
          >
            {open ? <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="bg-card/90 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center gap-4 flex-shrink-0 z-10">
          <button onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground transition-colors sm:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground">{user?.full_name ?? 'Administrator'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user?.role ?? 'admin'}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-olive/15 border border-olive/25 flex items-center justify-center">
              <span className="text-olive text-sm font-semibold">{user?.full_name?.charAt(0) ?? 'A'}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-cream via-background to-cream-dark">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
