import { useState, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import {
  LayoutDashboard, Building2, Users, Users2, BookMarked,
  BookOpen, Wallet, LogOut, ChevronLeft, ChevronRight,
  ShieldCheck, Settings, UserCog, ChevronDown, Calendar, Crown, Lock,
} from 'lucide-react';
import churchLogo from '../../assets/st-francis-logo.jpg';

type NavItem = { path: string; label: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Church Units',
    items: [
      { path: '/admin/church-units', label: 'Church Units', icon: Building2 },
    ],
  },
  {
    label: 'Parish Life',
    items: [
      { path: '/admin/parishioners', label: 'Parishioners', icon: Users },
      { path: '/admin/communities', label: 'Communities', icon: Users2 },
      { path: '/admin/societies', label: 'Societies', icon: BookMarked },
      { path: '/admin/events', label: 'Events', icon: Calendar },
      { path: '/admin/leadership', label: 'Leadership', icon: Crown },
      { path: '/admin/sacraments', label: 'Sacraments', icon: BookOpen },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/admin/finance', label: 'Finance', icon: Wallet },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/admin/settings', label: 'App Settings', icon: Settings },
      { path: '/admin/users', label: 'User Management', icon: UserCog },
      { path: '/admin/roles', label: 'Roles & Permissions', icon: Lock },
    ],
  },
];

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-5 w-5 text-navy-muted" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const { config } = useAppConfig();
  const logoSrc = config.logo_url || churchLogo;
  const shortName = config.church_code || config.name;
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const handleLogout = () => {
    logout();
    navigate('/login/admin', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ── */}
      <aside className={`
        relative flex flex-col flex-shrink-0
        bg-[#1a2d52]
        border-r border-white/[0.07]
        transition-[width] duration-300 ease-in-out
        ${open ? 'w-60' : 'w-16'}
      `}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#4cb8d7]/60 to-transparent" />

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.08) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        {/* Logo */}
        <div className={`relative flex items-center gap-3 border-b border-white/[0.06] py-4 ${open ? 'px-4' : 'px-4 justify-center'}`}>
          <div className="w-8 h-8 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-md">
            <img src={logoSrc} alt={shortName} className="w-full h-full object-cover" />
          </div>
          {open && (
            <div className="overflow-hidden">
              <p className="text-white font-bold tracking-widest uppercase text-xs leading-tight">{shortName}</p>
              <p className="text-white/40 text-[10px] leading-tight mt-0.5">Admin Portal</p>
            </div>
          )}
        </div>

        {/* Admin badge */}
        {open && (
          <div className="relative px-3 py-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 bg-[#8e3168]/20 border border-[#8e3168]/30 rounded-lg px-2.5 py-1.5">
              <ShieldCheck className="w-3 h-3 text-[#d97fbf] flex-shrink-0" />
              <span className="text-[#d97fbf] text-[10px] font-semibold tracking-wide uppercase">Super Admin</span>
            </div>
          </div>
        )}
        {!open && (
          <div className="relative flex justify-center py-2 border-b border-white/[0.06]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#d97fbf]" />
          </div>
        )}

        {/* Nav */}
        <nav className="relative flex-1 py-3 overflow-y-auto scrollbar-thin">
          {NAV_GROUPS.map(({ label, items }) => {
            const isGroupCollapsed = collapsedGroups[label];
            return (
              <div key={label} className="mb-1">
                {/* Group label */}
                {open && (
                  <button
                    onClick={() => toggleGroup(label)}
                    className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest hover:text-slate-400 transition-colors"
                  >
                    {label}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                )}
                {!open && <div className="mx-2 my-1.5 h-px bg-white/[0.06]" />}

                {/* Items */}
                {!isGroupCollapsed && (
                  <div className="px-2 space-y-0.5">
                    {items.map(({ path, label: itemLabel, icon: Icon }) => {
                      const active = isActive(path);
                      return (
                        <button
                          key={path}
                          onClick={() => navigate(path)}
                          title={!open ? itemLabel : undefined}
                          className={`
                            w-full flex items-center rounded-lg transition-all duration-150 text-sm
                            ${open ? 'gap-2.5 px-3 py-2' : 'justify-center px-0 py-2.5'}
                            ${active
                              ? 'bg-[#4cb8d7]/15 text-[#8ed8eb] border border-[#4cb8d7]/25'
                              : 'text-slate-300 hover:text-white hover:bg-white/[0.07] border border-transparent'
                            }
                          `}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {open && (
                            <>
                              <span className="font-medium truncate flex-1 text-left text-[13px]">{itemLabel}</span>
                              {active && <div className="w-1.5 h-1.5 rounded-full bg-[#4cb8d7] shrink-0" />}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User row */}
        <div className="relative border-t border-white/[0.06]">
          {open ? (
            <div className="flex items-center gap-2.5 px-4 py-3">
              <div className="w-7 h-7 rounded-full bg-[#4cb8d7]/20 border border-[#4cb8d7]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-[#8ed8eb] text-xs font-bold">{user?.full_name?.charAt(0) ?? 'A'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-xs font-medium truncate">{user?.full_name ?? 'Super Admin'}</p>
                <p className="text-white/35 text-[10px] leading-tight">super_admin</p>
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
            className={`w-full flex items-center gap-2 py-2 border-t border-white/[0.06] text-white/25 hover:text-white/55 transition-colors text-xs ${open ? 'px-4' : 'justify-center px-0'}`}
          >
            {open ? <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center gap-4 flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-golden" />
            <span className="text-xs font-semibold text-golden uppercase tracking-widest">Admin Portal</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground">{user?.full_name ?? 'Super Admin'}</p>
              <p className="text-[10px] text-navy/60">super_admin</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-golden/15 border border-golden/30 flex items-center justify-center">
              <span className="text-golden text-sm font-semibold">{user?.full_name?.charAt(0) ?? 'A'}</span>
            </div>
          </div>
        </header>

        {/* Page content — Suspense here prevents sidebar from unmounting on page transitions */}
        <main className="flex-1 min-h-0 overflow-hidden bg-background">
          {/* h-full + overflow-auto: scroll container at exact viewport height minus topbar */}
          <div className="h-full overflow-auto p-6">
            {/* h-full here = content area of the scrollable div; flex-col lets pages use flex-1 */}
            <div className="h-full max-w-7xl mx-auto flex flex-col">
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
