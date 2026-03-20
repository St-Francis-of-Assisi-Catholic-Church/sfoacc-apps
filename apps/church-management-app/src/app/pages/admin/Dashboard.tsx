import { useEffect, useState, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAppConfig } from '../../contexts/AppConfigContext';
import {
  Building2, Users, Users2, BookMarked,
  CheckCircle, Clock, ShieldCheck, ChevronRight, MapPin,
  Server, RefreshCw, Activity, BarChart3, DollarSign,
  Heart, Zap, UserCheck, IdCard, TrendingUp,
} from 'lucide-react';
import type { ChurchUnit } from '@sfoacc/sdk';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

type ParishStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getParishionerStats']>>['data'];
type HealthData = Awaited<ReturnType<ReturnType<typeof useSDK>['getSystemHealth']>>;
type AuditEntry = NonNullable<Awaited<ReturnType<ReturnType<typeof useSDK>['getAuditLogs']>>['data']>['items'][number];
type RegistrationStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getRegistrationStats']>>['data'];
type SystemDashStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getDashboardSystemStats']>>['data'];
type StationStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getDashboardStationStats']>>['data'];
type Tab = 'system' | 'demographics' | 'societies' | 'communities' | 'sacraments' | 'registration' | 'financials';

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

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

function topNDist(dist: Record<string, number> | undefined, n: number) {
  if (!dist) return [];
  return Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));
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

// ── Unit selector bar ──────────────────────────────────────────────────────────

function UnitSelector({ units, selectedUnitId, onChange }: { units: ChurchUnit[]; selectedUnitId: number | null; onChange: (id: number | null) => void }) {
  const filtered = units.filter(u => u.type !== 'outstation');
  if (filtered.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap mb-5">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Filter by unit:</span>
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${selectedUnitId === null ? 'bg-navy text-white border-navy' : 'border-border text-muted-foreground hover:text-foreground hover:border-navy/30'}`}
      >
        All (Parish)
      </button>
      {filtered.map(u => (
        <button key={u.id} onClick={() => onChange(u.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${selectedUnitId === u.id ? 'bg-navy text-white border-navy' : 'border-border text-muted-foreground hover:text-foreground hover:border-navy/30'}`}
        >
          {u.name}
        </button>
      ))}
    </div>
  );
}

// ── Stats loading skeleton ─────────────────────────────────────────────────────

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
  const [verifiedParishioners, setVerifiedParishioners] = useState(-1);
  const [churchUnits, setChurchUnits] = useState<ChurchUnit[]>([]);
  const [expandedParishes, setExpandedParishes] = useState<Set<number>>(new Set());

  const [parishStats, setParishStats] = useState<ParishStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

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

  const loadStats = useCallback((unitId: number | null) => {
    setStatsLoading(true);
    const params = unitId ? { church_unit_id: unitId } : {};
    client.getParishionerStats(params)
      .then(r => setParishStats(r.data))
      .catch(() => setParishStats(null))
      .finally(() => setStatsLoading(false));
  }, [client]);

  const loadHealth = useCallback((quiet = false) => {
    if (quiet) setHealthRefreshing(true); else setHealthLoading(true);
    client.getSystemHealth()
      .then(r => setHealth(r))
      .catch(() => setHealth(null))
      .finally(() => { setHealthLoading(false); setHealthRefreshing(false); });
  }, [client]);

  const loadActivity = useCallback(() => {
    setActivityLoading(true);
    client.getAuditLogs({ limit: 8 })
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

    client.listParishioners({ limit: 1, skip: 0, verification_status: 'verified' as never }).then(r => {
      setVerifiedParishioners(r.data?.total ?? 0);
    }).catch(() => setVerifiedParishioners(0));

    client.listChurchUnits({ limit: 100 }).then(r => {
      const units = r.data?.items ?? [];
      setChurchUnits(units);
      setExpandedParishes(new Set(units.filter(u => u.type === 'parish').map(u => u.id)));
    }).catch(() => setChurchUnits([]));

    loadStats(null);
    loadHealth();
    loadActivity();
    client.getRegistrationStats().then(r => setRegistrationStats(r.data)).catch(() => setRegistrationStats(null)).finally(() => setRegistrationLoading(false));
    client.getDashboardSystemStats().then(r => setSystemDashStats(r.data)).catch(() => setSystemDashStats(null)).finally(() => setSystemDashLoading(false));
    client.getDashboardStationStats().then(r => setStationStats(r.data)).catch(() => setStationStats(null)).finally(() => setStationStatsLoading(false));
  }, [client, loadStats, loadHealth, loadActivity]);

  useEffect(() => { loadStats(selectedUnitId); }, [selectedUnitId, loadStats]);

  const verifiedPct = totalParishioners > 0 ? Math.round((verifiedParishioners / totalParishioners) * 100) : 0;
  const now = new Date();
  const dateStr = `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin';

  // Chart data
  const genderData = distToChartData(parishStats?.gender_distribution);
  const ageData = distToChartData(parishStats?.age_group_distribution);
  const maritalData = distToChartData(parishStats?.marital_status_distribution);
  const sacramentData = distToChartData(parishStats?.sacraments_distribution);
  const topSocieties = topNDist(parishStats?.society_distribution, 10);
  const communityData = topNDist(parishStats?.church_community_distribution, 8);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'system',       label: 'System',            icon: Server      },
    { id: 'demographics', label: 'Demographics',      icon: Users       },
    { id: 'societies',    label: 'Societies',          icon: BookMarked  },
    { id: 'communities',  label: 'Communities',        icon: Users2      },
    { id: 'sacraments',   label: 'Sacraments',         icon: Heart       },
    { id: 'registration', label: 'Registration',       icon: UserCheck   },
    { id: 'financials',   label: 'Financials',         icon: DollarSign  },
  ];

  return (
    <div className="space-y-6">

      {/* ── Welcome card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7c5a2a] via-[#a07840] to-[#c9a057] border border-white/[0.07] p-7 shadow-lg">
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
            { label: 'Outstations', value: outstations },
            { label: 'Societies', value: societies },
            { label: 'Communities', value: communities },
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground text-sm">Recent Activity</h2>
              </div>
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
                {/* Overall status row */}
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
                {/* Services */}
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
                {/* Church Hierarchy */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hierarchy</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Parishes', value: systemDashStats.church_hierarchy.total_parishes },
                      { label: 'Outstations', value: systemDashStats.church_hierarchy.total_outstations },
                      { label: 'Total Units', value: systemDashStats.church_hierarchy.total_units },
                      { label: 'Active', value: systemDashStats.church_hierarchy.active_units },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-sm font-bold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Mass Services */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BookMarked className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mass Services</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Total Schedules', value: systemDashStats.mass_services.total_schedules },
                      { label: 'Active', value: systemDashStats.mass_services.active_schedules },
                      ...Object.entries(systemDashStats.mass_services.by_mass_type).map(([k, v]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: v })),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground capitalize">{label}</span>
                        <span className="text-sm font-bold text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Users & Access */}
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
                {/* Communications */}
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
        <div>
          <UnitSelector units={churchUnits} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          {statsLoading ? <ChartSkeleton cols={2} /> : !parishStats ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Statistics unavailable.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5">

              {/* Gender — Donut */}
              <ChartCard title="Gender Distribution" icon={Users}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {genderData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-muted-foreground capitalize">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Marital Status — Donut */}
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

              {/* Age Groups — Bar (full width) */}
              <ChartCard title="Age Groups" icon={BarChart3} className="sm:col-span-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ageData} barSize={36}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {ageData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

             

              {/* Birth Day of Week — Bar (from stationStats, full width) */}
              {stationStats && !stationStatsLoading && (() => {
                const birthDayData = distToChartData(stationStats.demographics.birth_day_of_week.total);
                return birthDayData.length > 0 ? (
                  <ChartCard title="Birth Day of Week" icon={BarChart3} className="sm:col-span-2">
                    <ResponsiveContainer width="100%" height={220}>
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
                ) : null;
              })()}

            </div>
          )}
        </div>
      )}

      {/* ── Tab: Societies ── */}
      {activeTab === 'societies' && (
        <div>
          <UnitSelector units={churchUnits} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          {statsLoading ? <ChartSkeleton cols={1} /> : !parishStats ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Statistics unavailable.</p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Societies',           value: parishStats.total_societies,                 suffix: '' },
                  { label: 'Parishioners in Societies', value: parishStats.parishioners_in_societies,       suffix: '' },
                  { label: 'Without a Society',         value: parishStats.parishioners_without_society,   suffix: '' },
                  { label: 'Society Coverage',          value: stationStats?.societies.society_coverage_pct ?? 0, suffix: '%' },
                ].map(({ label, value, suffix }) => (
                  <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
                    <p className="text-3xl font-bold text-foreground">{(value ?? 0).toLocaleString()}{suffix}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Top societies bar */}
              <ChartCard title="Top Societies by Members" icon={BookMarked}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topSocieties} barSize={32}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {topSocieties.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

            </div>
          )}
        </div>
      )}

      {/* ── Tab: Communities ── */}
      {activeTab === 'communities' && (
        <div>
          <UnitSelector units={churchUnits} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          {statsLoading ? <ChartSkeleton cols={1} /> : !parishStats ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Statistics unavailable.</p>
            </div>
          ) : (
            <div className="space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5 text-center">
                  <p className="text-3xl font-bold text-foreground">{(parishStats.total_church_communities ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Communities</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 text-center">
                  <p className="text-3xl font-bold text-foreground">{communityData.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Communities with Members</p>
                </div>
              </div>

              <ChartCard title="Community Distribution" icon={Users2}>
                <ResponsiveContainer width="100%" height={Math.max(260, communityData.length * 36)}>
                  <BarChart data={communityData} layout="vertical" barSize={18}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={130} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {communityData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

            </div>
          )}
        </div>
      )}

      {/* ── Tab: Sacraments ── */}
      {activeTab === 'sacraments' && (
        <div>
          <UnitSelector units={churchUnits} selectedUnitId={selectedUnitId} onChange={setSelectedUnitId} />
          {statsLoading ? <ChartSkeleton cols={1} /> : !parishStats ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Statistics unavailable.</p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Sacrament summary tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {sacramentData.map(({ name, value }, i) => {
                  const pct = stationStats?.sacraments?.[name]?.percentage;
                  return (
                    <div key={name} className="bg-card border border-border rounded-xl p-4 text-center">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${PALETTE[i % PALETTE.length]}18` }}>
                        <Heart className="w-4 h-4" style={{ color: PALETTE[i % PALETTE.length] }} />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                      {pct !== undefined && (
                        <p className="text-xs font-semibold mt-0.5" style={{ color: PALETTE[i % PALETTE.length] }}>{pct.toFixed(1)}%</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{name}</p>
                    </div>
                  );
                })}
              </div>

              {/* Sacraments horizontal bar */}
              <ChartCard title="Sacraments Coverage" icon={Heart}>
                <ResponsiveContainer width="100%" height={Math.max(200, sacramentData.length * 40)}>
                  <BarChart data={sacramentData} layout="vertical" barSize={18}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={130} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {sacramentData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 4) % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

            </div>
          )}
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
                  { label: 'Total Parishioners', value: registrationStats.total_parishioners, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                  { label: 'Verified', value: registrationStats.total_verified, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Pending Verification', value: registrationStats.total_pending_verification, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                  { label: 'Unverified', value: registrationStats.total_unverified, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' },
                  { label: 'With Church ID', value: registrationStats.total_with_new_church_id, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
                  { label: 'Without Church ID', value: registrationStats.total_without_new_church_id, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
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
                    { label: 'Verified', value: registrationStats.total_verified, total: registrationStats.total_parishioners, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                    { label: 'Pending Verification', value: registrationStats.total_pending_verification, total: registrationStats.total_parishioners, color: 'bg-amber-400', textColor: 'text-amber-600' },
                    { label: 'Unverified', value: registrationStats.total_unverified, total: registrationStats.total_parishioners, color: 'bg-red-400', textColor: 'text-red-500' },
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
                    { label: 'Assigned', value: registrationStats.total_with_new_church_id, total: registrationStats.total_parishioners, color: 'bg-sky-500', textColor: 'text-sky-600' },
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

              {/* Station overview if available */}
              {stationStats && !stationStatsLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Active', value: stationStats.overview.active },
                    { label: 'Deceased', value: stationStats.overview.deceased },
                    { label: 'Verification Rate', value: `${stationStats.overview.verification_rate_pct}%` },
                    { label: 'Church ID Coverage', value: `${stationStats.overview.church_id_coverage_pct}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
                      <p className="text-xl font-bold text-foreground">{value}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}
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
