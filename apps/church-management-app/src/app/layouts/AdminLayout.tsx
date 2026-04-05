import { useState, useRef, useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import {
  LayoutDashboard, Building2, Users, Users2, BookMarked,
  BookOpen, Wallet, LogOut, ChevronLeft, ChevronRight, Menu,
  ShieldCheck, Settings, UserCog, ChevronDown, Calendar, Crown, Lock, UserCircle, Download, MessageSquare, Activity, ClipboardList,
} from 'lucide-react';
import churchLogo from '../../assets/st-francis-logo.jpg';

type NavItem = { path: string; label: string; icon: React.ElementType; permission?: string; superAdminOnly?: boolean };
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
      { path: '/admin/parishioners', label: 'Parishioners',  icon: Users,         permission: 'parishioner:read' },
      { path: '/admin/registration', label: 'Registration',  icon: ClipboardList, permission: 'parishioner:verify' },
      { path: '/admin/communities',  label: 'Communities',   icon: Users2,         permission: 'community:read' },
      { path: '/admin/societies',    label: 'Societies',     icon: BookMarked,     permission: 'society:read' },
      { path: '/admin/events',       label: 'Events',        icon: Calendar },
      { path: '/admin/leadership',   label: 'Leadership',    icon: Crown },
      { path: '/admin/sacraments',   label: 'Sacraments',    icon: BookOpen,       permission: 'statistics:read' },
      { path: '/admin/communication',label: 'Communication', icon: MessageSquare,  permission: 'messaging:send' },
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
      { path: '/admin/settings',   label: 'App Settings',      icon: Settings, permission: 'admin:settings' },
      { path: '/admin/users',      label: 'User Management',   icon: UserCog,  permission: 'user:read' },
      { path: '/admin/roles',      label: 'Roles & Permissions',icon: Lock,    superAdminOnly: true },
      { path: '/admin/exports',    label: 'Exports & Reports', icon: Download, permission: 'reporting:read' },
      { path: '/admin/audit-logs', label: 'Audit Logs',        icon: Activity, superAdminOnly: true },
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
  const { user, logout, hasPermission } = useAdminAuth();
  const { config } = useAppConfig();
  const logoSrc = config.logo_url || churchLogo;
  const shortName = config.church_code || config.name;
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        flex flex-col flex-shrink-0
        bg-[#1a2d52]
        border-r border-white/[0.07]
        transition-all duration-300 ease-in-out
        fixed inset-y-0 left-0 z-50
        md:relative md:z-auto
        w-60 ${open ? 'md:w-60' : 'md:w-16'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
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
            const visibleItems = items.filter(item => {
              if (item.superAdminOnly) return user?.role === 'super_admin';
              if (item.permission) return hasPermission(item.permission);
              return true;
            });
            if (visibleItems.length === 0) return null;
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
                    {visibleItems.map(({ path, label: itemLabel, icon: Icon }) => {
                      const active = isActive(path);
                      return (
                        <button
                          key={path}
                          onClick={() => { navigate(path); setMobileOpen(false); }}
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

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setOpen(o => !o)}
            className={`hidden md:flex w-full items-center gap-2 py-2 border-t border-white/[0.06] text-white/25 hover:text-white/55 transition-colors text-xs ${open ? 'px-4' : 'justify-center px-0'}`}
          >
            {open ? <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-border px-3 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 flex-shrink-0 z-10 shadow-sm">
          <button onClick={() => setMobileOpen(o => !o)} className="text-muted-foreground hover:text-foreground transition-colors md:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-golden" />
            <span className="text-xs font-semibold text-golden uppercase tracking-widest">Admin Portal</span>
          </div>
          <div className="flex-1" />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-foreground">{user?.full_name ?? 'Super Admin'}</p>
                <p className="text-[10px] text-navy/60">super_admin</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-golden/15 border border-golden/30 flex items-center justify-center">
                <span className="text-golden text-sm font-semibold">{user?.full_name?.charAt(0) ?? 'A'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/admin/profile'); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" />
                  My Profile
                </button>
                <div className="mx-3 my-1 h-px bg-border" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content — Suspense here prevents sidebar from unmounting on page transitions */}
        <main className="flex-1 min-h-0 overflow-hidden bg-background">
          {/* h-full + overflow-auto: scroll container at exact viewport height minus topbar */}
          <div className="h-full overflow-auto p-4 sm:p-6">
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
