import { useState, useRef, useEffect, Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import {
  LayoutDashboard, Users, CalendarDays, BookOpen, Wallet,
  LogOut, ChevronLeft, ChevronRight, Menu, UserCircle, ChevronDown, Building2,
  Users2, BookMarked, MessageSquare,
} from 'lucide-react';
import churchLogo from '../../assets/st-francis-logo.jpg';
import type { LucideIcon } from 'lucide-react';

type NavItem = { path: string; label: string; icon: LucideIcon; exact?: boolean; permission?: string };

const ALL_NAV: NavItem[] = [
  { path: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { path: '/members',      label: 'Parishioners', icon: Users,           permission: 'parishioner:read' },
  { path: '/events',       label: 'Events',       icon: CalendarDays },
  { path: '/sacraments',   label: 'Sacraments',   icon: BookOpen },
  { path: '/communities',  label: 'Communities',  icon: Users2,          permission: 'community:read' },
  { path: '/societies',    label: 'Societies',    icon: BookMarked,      permission: 'society:read' },
  { path: '/communication',label: 'Communication',icon: MessageSquare,   permission: 'messaging:send' },
  { path: '/finance',      label: 'Finance',      icon: Wallet },
];

export default function AppLayout() {
  const { user, logout, selectedUnit, accessibleUnits, selectUnit, hasPermission } = useAuth();

  const navItems: NavItem[] = [
    ...ALL_NAV.filter(item => !item.permission || hasPermission(item.permission)),
    ...(hasPermission('admin:outstation') && selectedUnit?.id
      ? [{ path: `/church-unit/${selectedUnit.id}`, label: 'Church Unit', icon: Building2 }]
      : []),
  ];
  const { config } = useAppConfig();
  const logoSrc = config.logo_url || churchLogo;
  const shortName = config.church_code || config.name;
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (unitRef.current && !unitRef.current.contains(e.target as Node)) {
        setUnitOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

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
        bg-gradient-to-b from-navy-dark via-navy to-navy-dark
        transition-all duration-300 ease-in-out
        fixed inset-y-0 left-0 z-50
        md:relative md:z-auto
        w-64 ${open ? 'md:w-64' : 'md:w-16'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
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
          {navItems.map(({ path, label, icon: Icon, exact }) => {
            const active = isActive(path, exact);
            return (
              <button
                key={path}
                onClick={() => { navigate(path); setMobileOpen(false); }}
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

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setOpen(o => !o)}
            className={`hidden md:flex w-full items-center gap-2 py-2.5 border-t border-white/5 text-white/20 hover:text-white/50 transition-colors text-xs ${open ? 'px-4' : 'justify-center px-0'}`}
          >
            {open ? <><ChevronLeft className="w-3.5 h-3.5" /><span>Collapse</span></> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="bg-card/90 backdrop-blur-sm border-b border-border px-3 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 flex-shrink-0 z-30">
          <button onClick={() => setMobileOpen(o => !o)} className="text-muted-foreground hover:text-foreground transition-colors md:hidden">
            <Menu className="w-5 h-5" />
          </button>

          {/* ── Unit display / switcher — left of navbar ── */}
          <div className="relative" ref={unitRef}>
            {accessibleUnits.length > 1 ? (
              <button
                onClick={() => setUnitOpen(o => !o)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5  hover:bg-muted border border-transparent hover:border-border transition-all z-9999999"
              >
                <Building2 className="w-3.5 h-3.5 text-olive flex-shrink-0" />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-foreground max-w-[200px] truncate leading-tight">
                    {selectedUnit?.name ?? 'Select Unit'}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize leading-tight">{selectedUnit?.type ?? ''}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${unitOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 z-999999">
                <Building2 className="w-3.5 h-3.5 text-olive flex-shrink-0" />
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-foreground max-w-[200px] truncate leading-tight">
                    {selectedUnit?.name ?? accessibleUnits[0]?.name ?? ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                    {selectedUnit?.type ?? accessibleUnits[0]?.type ?? ''}
                  </p>
                </div>
              </div>
            )}

            {unitOpen && accessibleUnits.length > 1 && (
              <div className="absolute left-0 top-full mt-1.5 w-72 px-1l bg-card border border-border rounded-xl shadow-xl py-1.5 z-50">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">
                  Switch Church Unit
                </p>
                {accessibleUnits.map(unit => {
                  const active = selectedUnit?.id === unit.id;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => { selectUnit(unit); setUnitOpen(false); navigate('/dashboard'); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        active ? 'bg-olive/8 text-olive' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        active ? 'bg-olive/20' : 'bg-muted'
                      }`}>
                        <Building2 className={`w-4 h-4 ${active ? 'text-olive' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-medium truncate ${active ? 'text-olive' : 'text-foreground'}`}>
                          {unit.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground capitalize">{unit.type}</p>
                      </div>
                      {active && <span className="w-2 h-2 rounded-full bg-olive flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-foreground">{user?.full_name ?? 'Administrator'}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role_label ?? user?.role ?? 'user'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-olive/15 border border-olive/25 flex items-center justify-center">
                <span className="text-olive text-sm font-semibold">{user?.full_name?.charAt(0) ?? 'A'}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50">

                {/* User info header */}
                <div className="px-4 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{user?.full_name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{user?.email}</p>
                  {selectedUnit && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Building2 className="w-3 h-3 text-olive flex-shrink-0" />
                      <p className="text-[11px] text-olive font-medium truncate">{selectedUnit.name}</p>
                    </div>
                  )}
                </div>

                <div className="py-1">
                  <button
                    onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <UserCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    My Profile
                  </button>
                </div>

                <div className="border-t border-border pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content — Suspense here prevents sidebar from unmounting on page transitions */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-cream via-background to-cream-dark">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <svg className="animate-spin h-6 w-6 text-olive" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">Loading…</p>
                </div>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
