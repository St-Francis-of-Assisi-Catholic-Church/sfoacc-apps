import { useEffect, useState, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAppConfig } from '../../contexts/AppConfigContext';
import {
  Building2, Users, Users2, BookMarked,
  ShieldCheck, ChevronRight, MapPin,
  Server, RefreshCw, Activity, BarChart3, DollarSign,
  Heart, Zap, UserCheck, IdCard, TrendingUp,
} from 'lucide-react';
import type { ChurchUnit } from '@sfoacc/sdk';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

type HealthData = Awaited<ReturnType<ReturnType<typeof useSDK>['getSystemHealth']>>;
type AuditEntry = NonNullable<Awaited<ReturnType<ReturnType<typeof useSDK>['getAuditLogs']>>['data']>['items'][number];
type RegistrationStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getRegistrationStats']>>['data'];
type SystemDashStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getDashboardSystemStats']>>['data'];
type StationStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getDashboardStationStats']>>['data'];
type Tab = 'system' | 'demographics' | 'societies' | 'communities' | 'sacraments' | 'registration' | 'financials';

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const SACRAMENT_META: Record<string, { icon: string; palette: string; bg: string; text: string; border: string }> = {
  'Baptism':              { icon: '💧', palette: '#0ea5e9', bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200' },
  'First Communion':      { icon: '🍞', palette: '#f59e0b', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  'Confirmation':         { icon: '🕊️', palette: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'Penance':              { icon: '🙏', palette: '#10b981', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  'Anointing of the Sick':{ icon: '✝️', palette: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Holy Orders':          { icon: '⛪', palette: '#4f46e5', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Holy Matrimony':       { icon: '💍', palette: '#ec4899', bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function distToChartData(dist: Record<string, number> | undefined) {
  if (!dist) return [];
  return Object.entries(dist).map(([name, value]) => ({ name, value }));
}

function stackedByGender(byGender: Record<string, Record<string, number>> | undefined) {
  if (!byGender) return [];
  const male = byGender['male'] ?? {};
  const female = byGender['female'] ?? {};
  return Object.keys(male).map(k => ({ name: k, male: male[k] ?? 0, female: female[k] ?? 0 }));
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">{p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const MultiTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; fill: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }}>{p.name}: {p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

function ChartCard({ title, icon: Icon, children, className = '' }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function HealthDot({ status }: { status: string }) {
  const s = String(status).toLowerCase();
  if (s === 'healthy' || s === 'ok' || s === 'up' || s === 'true')
    return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block" />;
  if (s === 'degraded' || s === 'warn' || s === 'warning')
    return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 inline-block" />;
}

function ChartSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-${cols} gap-5`}>
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const client = useSDK();
  const { user } = useAdminAuth();
  const { config } = useAppConfig();

  const [activeTab, setActiveTab] = useState<Tab>('system');

  const [outstations, setOutstations] = useState(-1);
  const [societies, setSocieties] = useState(-1);
  const [communities, setCommunities] = useState(-1);
  const [totalParishioners, setTotalParishioners] = useState(-1);
  const [churchUnits, setChurchUnits] = useState<ChurchUnit[]>([]);
  const [expandedParishes, setExpandedParishes] = useState<Set<number>>(new Set());

  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthRefreshing, setHealthRefreshing] = useState(false);

  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [registrationStats, setRegistrationStats] = useState<RegistrationStats | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [systemDashStats, setSystemDashStats] = useState<SystemDashStats | null>(null);
  const [systemDashLoading, setSystemDashLoading] = useState(true);
  const [stationStats, setStationStats] = useState<StationStats | null>(null);
  const [stationStatsLoading, setStationStatsLoading] = useState(true);

  const loadHealth = useCallback((quiet = false) => {
    if (quiet) setHealthRefreshing(true); else setHealthLoading(true);
    client.getSystemHealth()
      .then(r => setHealth(r))
      .catch(() => setHealth(null))
      .finally(() => { setHealthLoading(false); setHealthRefreshing(false); });
  }, [client]);

  const loadActivity = useCallback(() => {
    setActivityLoading(true);
    client.getAuditLogs({ limit: 3 })
      .then(r => setRecentActivity(r.data?.items ?? []))
      .catch(() => setRecentActivity([]))
      .finally(() => setActivityLoading(false));
  }, [client]);

  useEffect(() => {
    client.listOutstations().then(r => setOutstations(r.data?.total ?? r.data?.items?.length ?? 0)).catch(() => setOutstations(0));
    client.listSocieties().then(r => setSocieties(r.data?.total ?? r.data?.items?.length ?? 0)).catch(() => setSocieties(0));
    client.listCommunities().then(r => setCommunities(r.data?.total ?? r.data?.items?.length ?? 0)).catch(() => setCommunities(0));

    client.getParishionerStats().then(r => {
      setTotalParishioners(r.data?.total_parishioners ?? 0);
    }).catch(() => {
      client.listParishioners({ limit: 1, skip: 0 }).then(r => setTotalParishioners(r.data?.total ?? 0)).catch(() => setTotalParishioners(0));
    });

    client.listChurchUnits({ limit: 100 }).then(r => {
      const units = r.data?.items ?? [];
      setChurchUnits(units);
      setExpandedParishes(new Set(units.filter(u => u.type === 'parish').map(u => u.id)));
    }).catch(() => setChurchUnits([]));

    loadHealth();
    loadActivity();
    client.getRegistrationStats().then(r => setRegistrationStats(r.data)).catch(() => setRegistrationStats(null)).finally(() => setRegistrationLoading(false));
    client.getDashboardSystemStats().then(r => setSystemDashStats(r.data)).catch(() => setSystemDashStats(null)).finally(() => setSystemDashLoading(false));
    client.getDashboardStationStats().then(r => setStationStats(r.data)).catch(() => setStationStats(null)).finally(() => setStationStatsLoading(false));
  }, [client, loadHealth, loadActivity]);

  const now = new Date();
  const dateStr = `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin';

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'system',       label: 'System',        icon: Server      },
    { id: 'demographics', label: 'Demographics',   icon: Users       },
    { id: 'societies',    label: 'Societies',      icon: BookMarked  },
    { id: 'communities',  label: 'Communities',    icon: Users2      },
    { id: 'sacraments',   label: 'Sacraments',     icon: Heart       },
    { id: 'registration', label: 'Registration',   icon: UserCheck   },
    { id: 'financials',   label: 'Financials',     icon: DollarSign  },
  ];

  const unavailable = (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Statistics unavailable.</p>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Welcome card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7c5a2a] via-[#a07840] to-[#c9a057] border border-white/[0.07] p-4 sm:p-7 shadow-lg">
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.06) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-300/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-yellow-900/20 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-1">
                <ShieldCheck className="w-3 h-3 text-violet-300" />
                <span className="text-violet-300 text-[10px] font-semibold tracking-widest uppercase">Super Admin</span>
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold text-white leading-tight">{getGreeting()}, {firstName}.</h1>
            <p className="text-white/45 text-sm mt-1">{config.name || 'Church Management System'}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm font-medium">{dateStr}</p>
            <p className="text-white/30 text-xs mt-0.5">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.07]">
          {[
            { label: 'Outstations',  value: outstations },
            { label: 'Societies',    value: societies },
            { label: 'Communities',  value: communities },
            { label: 'Parishioners', value: totalParishioners },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xl font-bold text-white leading-tight">
                {value === -1 ? <span className="text-white/30 text-sm animate-pulse">—</span> : value.toLocaleString()}
              </p>
              <p className="text-white/35 text-[11px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: System ── */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Recent Activity</h2>
            </div>
            {activityLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentActivity.map(entry => (
                  <div key={entry.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{entry.summary}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{entry.method} {entry.path}</p>
                      {entry.user_name && (
                        <p className="text-[10px] text-muted-foreground/70 truncate">by {entry.user_name}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">{new Date(entry.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Church hierarchy */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground text-sm">Church Hierarchy</h2>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            {churchUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
            ) : (() => {
              const parishes = churchUnits.filter(u => u.type === 'parish');
              const outstationsByParish = churchUnits.reduce<Record<number, ChurchUnit[]>>((acc, u) => {
                if (u.type === 'outstation' && u.parent_id) (acc[u.parent_id] ??= []).push(u);
                return acc;
              }, {});
              const toggle = (id: number) => setExpandedParishes(prev => {
                const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
              });
              const diocese = parishes[0]?.diocese || 'Accra Archdiocese';
              return (
                <div className="relative">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gold/10 border border-gold/20 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-gold/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{diocese}</p>
                      <p className="text-[10px] text-muted-foreground">Archdiocese</p>
                    </div>
                  </div>
                  <div className="ml-5 relative">
                    <div className="absolute left-2 top-0 bottom-4 w-px bg-border" />
                    <div className="space-y-0.5 pt-0.5">
                      {parishes.map(parish => {
                        const children = outstationsByParish[parish.id] ?? [];
                        const expanded = expandedParishes.has(parish.id);
                        return (
                          <div key={parish.id}>
                            <div className="flex items-center">
                              <div className="w-4 h-px bg-border ml-2 shrink-0" />
                              <button onClick={() => toggle(parish.id)}
                                className="flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left">
                                <div className="w-6 h-6 rounded-md bg-navy/10 flex items-center justify-center shrink-0">
                                  <Building2 className="w-3 h-3 text-navy" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{parish.name}</p>
                                  <p className="text-[10px] text-muted-foreground">Parish · {children.length} outstation{children.length !== 1 ? 's' : ''}</p>
                                </div>
                                <ChevronRight className={`w-3 h-3 text-muted-foreground/50 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                              </button>
                            </div>
                            {expanded && children.length > 0 && (
                              <div className="ml-9 relative">
                                <div className="absolute left-2 top-0 bottom-4 w-px bg-border/60" />
                                {children.map(out => (
                                  <div key={out.id} className="flex items-center">
                                    <div className="w-4 h-px bg-border/60 ml-2 shrink-0" />
                                    <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                                      <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                                        <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                                      </div>
                                      <span className="text-xs text-muted-foreground truncate">{out.name}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* System Health */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm">System Health</h2>
              </div>
              <button type="button" onClick={() => loadHealth(true)} disabled={healthRefreshing}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${healthRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {healthLoading ? (
              <p className="text-sm text-muted-foreground animate-pulse">Checking services…</p>
            ) : !health ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-4 h-4 text-red-400" />
                Health endpoint unreachable
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <HealthDot status={health.status} />
                      <span className="text-xs font-semibold text-foreground capitalize">{health.status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      v{health.version} · <span className="capitalize">{health.environment}</span>
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {health.timestamp ? new Date(health.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                  </p>
                </div>
                {health.services && Object.entries(health.services).map(([name, svc]) => (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <HealthDot status={svc.status} />
                        <span className="text-xs font-medium text-foreground capitalize">{name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-medium text-muted-foreground capitalize">{svc.status}</span>
                        {svc.latency_ms !== undefined && (
                          <span className="text-[10px] text-muted-foreground/60 ml-1.5">{svc.latency_ms.toFixed(0)} ms</span>
                        )}
                      </div>
                    </div>
                    {svc.jobs && svc.jobs.length > 0 && (
                      <div className="ml-4 space-y-0.5">
                        {svc.jobs.map(job => (
                          <div key={job.id} className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-muted-foreground truncate">{job.id.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-muted-foreground/50 shrink-0">
                              next {new Date(job.next_run).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System dashboard stats */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemDashLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 h-32 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
                </div>
              ))
            ) : !systemDashStats ? (
              <div className="col-span-4 bg-card border border-border rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">System statistics unavailable.</p>
              </div>
            ) : (
              <>
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hierarchy</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Parishes',    value: systemDashStats.church_hierarchy.total_parishes },
                      { label: 'Outstations', value: systemDashStats.church_hierarchy.total_outstations },
                      { label: 'Total Units', value: systemDashStats.church_hierarchy.total_units },
                      { label: 'Active',      value: systemDashStats.church_hierarchy.active_units },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-sm font-bold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BookMarked className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mass Services</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Total Schedules', value: systemDashStats.mass_services.total_schedules },
                      { label: 'Active',           value: systemDashStats.mass_services.active_schedules },
                      ...Object.entries(systemDashStats.mass_services.by_mass_type).map(([k, v]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: v })),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground capitalize">{label}</span>
                        <span className="text-sm font-bold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Users & Access</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Users</span>
                      <span className="text-sm font-bold text-foreground">{systemDashStats.users_and_access.total_users}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">No Role</span>
                      <span className="text-sm font-bold text-foreground">{systemDashStats.users_and_access.no_role_assigned}</span>
                    </div>
                    {Object.entries(systemDashStats.users_and_access.by_role).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{role}</span>
                        <span className="text-sm font-bold text-foreground">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Communications</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Recipients Reached</span>
                      <span className="text-sm font-bold text-foreground">{systemDashStats.communications.total_recipients_reached}</span>
                    </div>
                    {Object.entries(systemDashStats.communications.by_status).length === 0 ? (
                      <p className="text-xs text-muted-foreground/50">No messages sent yet</p>
                    ) : (
                      Object.entries(systemDashStats.communications.by_status).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground capitalize">{status}</span>
                          <span className="text-sm font-bold text-foreground">{count as number}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* ── Tab: Demographics ── */}
      {activeTab === 'demographics' && (
        <div className="space-y-5">
          {stationStatsLoading ? <ChartSkeleton cols={2} /> : !stationStats ? unavailable : (() => {
            const genderRec = stationStats.demographics.gender; // Record<string, number>
            const genderPieData = Object.entries(genderRec).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
            const totalDemog = Object.values(genderRec).reduce((s, v) => s + v, 0);
            const maritalData = distToChartData(stationStats.demographics.marital_status?.total);
            const ageStackedData = stackedByGender(stationStats.demographics.age_groups?.by_gender);
            const birthDayData = distToChartData(stationStats.demographics.birth_day_of_week?.total);
            const maritalStackedData = stackedByGender(stationStats.demographics.marital_status?.by_gender);
            return (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Parishioners', value: stationStats.overview.total_parishioners, color: 'text-foreground' },
                    { label: 'Male',               value: genderRec['male'] ?? 0,                   color: 'text-sky-600'    },
                    { label: 'Female',             value: genderRec['female'] ?? 0,                 color: 'text-rose-500'   },
                    { label: 'Other / Unknown',    value: totalDemog - (genderRec['male'] ?? 0) - (genderRec['female'] ?? 0), color: 'text-slate-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
                      <p className={`text-3xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Gender donut */}
                  <ChartCard title="Gender Distribution" icon={Users}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={genderPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {genderPieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Marital status donut */}
                  <ChartCard title="Marital Status" icon={Users2}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={maritalData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {maritalData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground capitalize">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Age groups stacked by gender */}
                  {ageStackedData.length > 0 && (
                    <ChartCard title="Age Groups by Gender" icon={BarChart3} className="sm:col-span-2">
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={ageStackedData} barSize={28}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip content={<MultiTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground capitalize">{v}</span>} />
                          <Bar dataKey="male" name="Male" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="female" name="Female" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {/* Marital status by gender stacked */}
                  {maritalStackedData.length > 0 && (
                    <ChartCard title="Marital Status by Gender" icon={Users2} className="sm:col-span-2">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={maritalStackedData} barSize={28}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip content={<MultiTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground capitalize">{v}</span>} />
                          <Bar dataKey="male" name="Male" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="female" name="Female" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {/* Birth day of week */}
                  {birthDayData.length > 0 && (
                    <ChartCard title="Birth Day of Week" icon={BarChart3} className="sm:col-span-2">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={birthDayData} barSize={36}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {birthDayData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Societies ── */}
      {activeTab === 'societies' && (
        <div className="space-y-5">
          {stationStatsLoading ? <ChartSkeleton cols={1} /> : !stationStats ? unavailable : (() => {
            const soc = stationStats.societies;
            const sorted = Object.entries(soc.by_society ?? {})
              .map(([name, v]) => ({
                society_name: name,
                total_members: v.total_members,
                male: v.by_gender['male'] ?? 0,
                female: v.by_gender['female'] ?? 0,
                active: v.by_membership_status['active'] ?? 0,
                inactive: v.by_membership_status['inactive'] ?? 0,
              }))
              .sort((a, b) => b.total_members - a.total_members);
            const top15 = sorted.slice(0, 15).map(s => ({ name: s.society_name, value: s.total_members }));
            const totalMembers = sorted.reduce((sum, s) => sum + s.total_members, 0);
            return (
              <>
                {/* KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Societies',    value: soc.total_societies,         suffix: '',  color: 'text-foreground' },
                    { label: 'Society Members',    value: totalMembers,                 suffix: '',  color: 'text-indigo-600' },
                    { label: 'Society Coverage',   value: soc.society_coverage_pct,    suffix: '%', color: 'text-emerald-600' },
                    { label: 'Societies w/ Members', value: sorted.filter(s => s.total_members > 0).length, suffix: '', color: 'text-sky-600' },
                  ].map(({ label, value, suffix, color }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
                      <p className={`text-3xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}{suffix}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Top societies chart */}
                <ChartCard title="Top Societies by Members" icon={BookMarked}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={top15} barSize={24}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {top15.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Full societies table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">All Societies ({sorted.length})</h3>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Society</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-sky-600">Male</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-rose-500">Female</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-emerald-600">Active</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Inactive</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sorted.map((s, i) => (
                          <tr key={s.society_name} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 text-muted-foreground/50">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-foreground">{s.society_name}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-foreground">{s.total_members.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-sky-600">{s.male.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-rose-500">{s.female.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-600">{s.active.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{s.inactive.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Communities ── */}
      {activeTab === 'communities' && (
        <div className="space-y-5">
          {stationStatsLoading ? <ChartSkeleton cols={1} /> : !stationStats ? unavailable : (() => {
            const comm = stationStats.church_communities;
            const sorted = Object.entries(comm.by_community ?? {})
              .map(([name, v]) => ({
                community_name: name,
                total_members: v.total_members,
                male: v.by_gender['male'] ?? 0,
                female: v.by_gender['female'] ?? 0,
                married: v.by_marital_status['married'] ?? 0,
                single: v.by_marital_status['single'] ?? 0,
                widowed: v.by_marital_status['widowed'] ?? 0,
                other: (v.by_marital_status['other'] ?? 0) + (v.by_marital_status['divorced'] ?? 0),
              }))
              .sort((a, b) => b.total_members - a.total_members);
            const chartData = sorted.map(c => ({ name: c.community_name, value: c.total_members }));
            const totalMembers = sorted.reduce((sum, c) => sum + c.total_members, 0);
            return (
              <>
                {/* KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Communities',    value: comm.total_communities,       suffix: '',  color: 'text-foreground' },
                    { label: 'Community Members',    value: totalMembers,                  suffix: '',  color: 'text-indigo-600' },
                    { label: 'Community Coverage',   value: comm.community_coverage_pct,  suffix: '%', color: 'text-emerald-600' },
                    { label: 'Communities w/ Members', value: sorted.filter(c => c.total_members > 0).length, suffix: '', color: 'text-sky-600' },
                  ].map(({ label, value, suffix, color }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
                      <p className={`text-3xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}{suffix}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Horizontal bar chart */}
                <ChartCard title="Community Distribution" icon={Users2}>
                  <ResponsiveContainer width="100%" height={Math.max(260, sorted.length * 36)}>
                    <BarChart data={chartData} layout="vertical" barSize={18}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={140} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Communities detail table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">Community Breakdown ({sorted.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/90 border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Community</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-sky-600">Male</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-rose-500">Female</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Married</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Single</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Widowed</th>
                          <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Other</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sorted.map(c => (
                          <tr key={c.community_name} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-foreground">{c.community_name}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-foreground">{c.total_members.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-sky-600">{c.male.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-rose-500">{c.female.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{c.married.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{c.single.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{c.widowed.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{c.other.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Sacraments ── */}
      {activeTab === 'sacraments' && (
        <div className="space-y-5">
          {stationStatsLoading ? <ChartSkeleton cols={2} /> : !stationStats ? unavailable : (() => {
            const sacEntries = Object.entries(stationStats.sacraments ?? {});
            const genderBarData = sacEntries.map(([name, d]) => ({
              name: name.replace('Anointing of the Sick', 'Anointing').replace('Holy ', ''),
              Male: d.by_gender?.['male'] ?? 0,
              Female: d.by_gender?.['female'] ?? 0,
            }));
            return (
              <>
                {/* Stat tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sacEntries.map(([name, data]) => {
                    const meta = SACRAMENT_META[name] ?? { icon: '✝️', palette: '#6366f1', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
                    const maleCount = data.by_gender?.['male'] ?? 0;
                    const femaleCount = data.by_gender?.['female'] ?? 0;
                    const total = maleCount + femaleCount;
                    const malePct = total > 0 ? Math.round((maleCount / total) * 100) : 0;
                    return (
                      <div key={name} className={`border rounded-xl p-4 ${meta.bg} ${meta.border}`}>
                        <div className="text-2xl mb-2">{meta.icon}</div>
                        <p className={`text-2xl font-bold leading-none ${meta.text}`}>{data.count.toLocaleString()}</p>
                        <p className={`text-xs font-semibold mt-0.5 ${meta.text} opacity-70`}>{data.percentage?.toFixed(1)}% of parishioners</p>
                        <p className={`text-sm font-medium mt-1 leading-tight ${meta.text}`}>{name}</p>
                        {total > 0 && (
                          <div className="mt-2.5 space-y-1">
                            <div className="flex justify-between text-[10px] opacity-60">
                              <span>♂ {maleCount}</span>
                              <span>♀ {femaleCount}</span>
                            </div>
                            <div className="h-1 rounded-full bg-current opacity-20 overflow-hidden flex">
                              <div className="h-full bg-sky-500 opacity-80" style={{ width: `${malePct}%` }} />
                              <div className="h-full bg-rose-400 opacity-80 flex-1" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Gender stacked bar */}
                {genderBarData.length > 0 && (
                  <ChartCard title="Sacraments by Gender" icon={Heart}>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={genderBarData} barSize={22}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip content={<MultiTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                        <Bar dataKey="Male" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Female" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Per-sacrament detail cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {sacEntries.map(([name, data], idx) => {
                    const meta = SACRAMENT_META[name] ?? { icon: '✝️', palette: PALETTE[idx % PALETTE.length], bg: 'bg-card', text: 'text-foreground', border: 'border-border' };
                    const ageData = Object.entries(data.by_age_group ?? {}).map(([k, v]) => ({ name: k, value: v }));
                    const topComm = Object.entries(data.by_community ?? {})
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([community_name, count]) => ({ community_name, count }));
                    return (
                      <div key={name} className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center gap-2.5 mb-4">
                          <span className="text-xl">{meta.icon}</span>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                            <p className="text-xs text-muted-foreground">{data.count.toLocaleString()} recipients · {data.percentage?.toFixed(1)}%</p>
                          </div>
                        </div>

                        {ageData.length > 0 && (
                          <div className="mb-4">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Age Group</p>
                            <ResponsiveContainer width="100%" height={100}>
                              <BarChart data={ageData} barSize={16}>
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                                <Bar dataKey="value" fill={meta.palette} radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {topComm.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Communities</p>
                            <div className="space-y-1.5">
                              {topComm.map(c => {
                                const pct = data.count > 0 ? (c.count / data.count) * 100 : 0;
                                return (
                                  <div key={c.community_name}>
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{c.community_name}</span>
                                      <span className="text-[10px] font-medium text-foreground ml-2 shrink-0">{c.count}</span>
                                    </div>
                                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.palette }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Registration ── */}
      {activeTab === 'registration' && (
        <div className="space-y-5">
          {registrationLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
                </div>
              ))}
            </div>
          ) : !registrationStats ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">Registration statistics unavailable.</p>
            </div>
          ) : (
            <>
              {/* Summary tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Parishioners',    value: registrationStats.total_parishioners,          color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                  { label: 'Verified',               value: registrationStats.total_verified,             color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Pending Verification',   value: registrationStats.total_pending_verification, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                  { label: 'Unverified',             value: registrationStats.total_unverified,           color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
                  { label: 'With Church ID',         value: registrationStats.total_with_new_church_id,  color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
                  { label: 'Without Church ID',      value: registrationStats.total_without_new_church_id, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
                ].map(({ label, value, color, bg, border }) => (
                  <div key={label} className={`bg-card border ${border} rounded-xl p-5 text-center`}>
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-2`}>
                      <UserCheck className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* Station overview */}
              {stationStats && !stationStatsLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Active',              value: stationStats.overview.active,                   suffix: '' },
                    { label: 'Deceased',            value: stationStats.overview.deceased,                 suffix: '' },
                    { label: 'Verification Rate',   value: stationStats.overview.verification_rate_pct,   suffix: '%' },
                    { label: 'Church ID Coverage',  value: stationStats.overview.church_id_coverage_pct,  suffix: '%' },
                  ].map(({ label, value, suffix }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-xl font-bold text-foreground">{value}{suffix}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Verification funnel */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Verification Status</h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {((registrationStats.total_verified / registrationStats.total_parishioners) * 100).toFixed(1)}% verified
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Verified',            value: registrationStats.total_verified,             total: registrationStats.total_parishioners, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                    { label: 'Pending Verification', value: registrationStats.total_pending_verification, total: registrationStats.total_parishioners, color: 'bg-amber-400', textColor: 'text-amber-600' },
                    { label: 'Unverified',           value: registrationStats.total_unverified,          total: registrationStats.total_parishioners, color: 'bg-red-400', textColor: 'text-red-500' },
                  ].map(({ label, value, total, color, textColor }) => {
                    const pct = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${textColor}`}>{value.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">({pct.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Church ID coverage */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-5">
                  <IdCard className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Church ID Assignment</h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {((registrationStats.total_with_new_church_id / registrationStats.total_parishioners) * 100).toFixed(1)}% assigned
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Assigned',     value: registrationStats.total_with_new_church_id,    total: registrationStats.total_parishioners, color: 'bg-sky-500', textColor: 'text-sky-600' },
                    { label: 'Not Assigned', value: registrationStats.total_without_new_church_id, total: registrationStats.total_parishioners, color: 'bg-slate-300', textColor: 'text-slate-500' },
                  ].map(({ label, value, total, color, textColor }) => {
                    const pct = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${textColor}`}>{value.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">({pct.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Financials ── */}
      {activeTab === 'financials' && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">Financials Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Financial reporting — dues, collections, and contribution tracking — will appear here once the financial module is available.
          </p>
        </div>
      )}

    </div>
  );
}
