import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSDK } from '../contexts/SDKContext';
import { useParish } from '@sfoacc/sdk';
import type { ChurchEventRead } from '@sfoacc/sdk';
import {
  Users, MapPin, CalendarDays, Activity, Church, ArrowUpRight,
  BarChart3, Users2, BookMarked, Heart, UserCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

type ParishStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getParishionerStats']>>['data'];
type RegistrationStats = Awaited<ReturnType<ReturnType<typeof useSDK>['getRegistrationStats']>>['data'];
type Tab = 'demographics' | 'societies' | 'communities' | 'sacraments' | 'registration';

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const SACRAMENT_META: Record<string, { icon: string; palette: string; bg: string; text: string; border: string }> = {
  'Baptism':               { icon: '💧', palette: '#0ea5e9', bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200' },
  'First Communion':       { icon: '🍞', palette: '#f59e0b', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  'Confirmation':          { icon: '🕊️', palette: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'Penance':               { icon: '🙏', palette: '#10b981', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  'Anointing of the Sick': { icon: '✝️', palette: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Holy Orders':           { icon: '⛪', palette: '#4f46e5', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Holy Matrimony':        { icon: '💍', palette: '#ec4899', bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toChartData(dist: Record<string, number> | undefined) {
  if (!dist) return [];
  return Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtEventDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Tooltip components ────────────────────────────────────────────────────────

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      <p className="text-muted-foreground">{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatValue({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (loading) return <span className="inline-block w-16 h-6 bg-white/10 rounded animate-pulse" />;
  return <>{children}</>;
}

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

function TabSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      ))}
    </div>
  );
}

function Unavailable() {
  return (
    <div className="bg-card border border-border rounded-xl p-8 text-center">
      <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Statistics unavailable.</p>
    </div>
  );
}

function ChurchWindowDecor() {
  return (
    <svg viewBox="0 0 180 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <path d="M90 8 Q172 8 172 90 L172 252 L8 252 L8 90 Q8 8 90 8Z" stroke="#b8963e" strokeWidth="1.5" fill="none" />
      <path d="M90 28 Q152 28 152 100 L152 236 L28 236 L28 100 Q28 28 90 28Z" stroke="#b8963e" strokeWidth="1" fill="none" />
      <line x1="90" y1="8" x2="90" y2="252" stroke="#b8963e" strokeWidth="1" />
      <line x1="8" y1="130" x2="172" y2="130" stroke="#b8963e" strokeWidth="1" />
      <circle cx="90" cy="130" r="28" stroke="#b8963e" strokeWidth="1" fill="none" />
      <circle cx="90" cy="130" r="16" stroke="#b8963e" strokeWidth="0.5" fill="none" />
      <path d="M90 102 L90 78" stroke="#b8963e" strokeWidth="1" />
      <path d="M78 114 L62 114" stroke="#b8963e" strokeWidth="1" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, selectedUnit } = useAuth();
  const client = useSDK();
  const navigate = useNavigate();

  const { data: parish, isLoading: pLoading } = useParish(client);

  const [activeTab, setActiveTab] = useState<Tab>('demographics');
  const [parishStats, setParishStats] = useState<ParishStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [regStats, setRegStats] = useState<RegistrationStats | null>(null);
  const [regLoading, setRegLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<ChurchEventRead[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [totalEvents, setTotalEvents] = useState(0);

  useEffect(() => {
    setStatsLoading(true);
    client.getParishionerStats({ church_unit_id: selectedUnit?.id })
      .then(r => setParishStats(r.data ?? null))
      .catch(() => setParishStats(null))
      .finally(() => setStatsLoading(false));

    setRegLoading(true);
    client.getRegistrationStats()
      .then(r => setRegStats(r.data ?? null))
      .catch(() => setRegStats(null))
      .finally(() => setRegLoading(false));

    setEventsLoading(true);
    (client.listEvents as Function)({ church_unit_id: selectedUnit?.id, upcoming_only: true, limit: 6 })
      .then((r: { data?: { items?: ChurchEventRead[]; total?: number } }) => {
        setUpcomingEvents(r.data?.items ?? []);
        setTotalEvents(r.data?.total ?? 0);
      })
      .catch(() => { setUpcomingEvents([]); setTotalEvents(0); })
      .finally(() => setEventsLoading(false));
  }, [client, selectedUnit?.id]);

  const totalMembers   = parishStats?.total_parishioners ?? 0;
  const totalSocieties = parishStats?.total_societies ?? 0;
  const outstationCount = parish?.outstations?.length ?? 0;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'demographics', label: 'Demographics', icon: Users      },
    { id: 'societies',    label: 'Societies',    icon: BookMarked },
    { id: 'communities',  label: 'Communities',  icon: Users2     },
    { id: 'sacraments',   label: 'Sacraments',   icon: Heart      },
    { id: 'registration', label: 'Registration', icon: UserCheck  },
  ];

  return (
    <div className="space-y-5">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-navy-dark via-navy to-navy-light">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(184,150,62,0.08) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        <div className="absolute -top-12 left-1/3 w-56 h-56 bg-olive/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 right-1/4 w-40 h-40 bg-golden/8 blur-2xl rounded-full pointer-events-none" />
        <div className="absolute right-0 top-0 h-full w-48 opacity-[0.07] pointer-events-none"><ChurchWindowDecor /></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-olive/50 to-transparent" />

        <div className="relative z-10 px-4 sm:px-7 py-5 sm:py-6">
          <p className="text-olive/70 text-xs font-medium uppercase tracking-widest mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-display font-bold text-white mb-1">
            Welcome back, {user?.full_name?.split(' ')[0] ?? 'Parish Member'}
          </h1>
          <p className="text-white/35 text-sm">{selectedUnit?.name ?? parish?.name ?? 'Parish Management Portal'}</p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Members',     value: totalMembers.toLocaleString(),  loading: statsLoading, icon: Users       },
              { label: 'Societies',   value: String(totalSocieties),         loading: statsLoading, icon: Church      },
              { label: 'Outstations', value: String(outstationCount),        loading: pLoading,     icon: MapPin      },
              { label: 'Events',      value: String(totalEvents),            loading: eventsLoading, icon: CalendarDays },
            ].map(({ label, value, loading, icon: Icon }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm hover:bg-white/8 transition-colors">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="w-3.5 h-3.5 text-olive/70" />
                  <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">{label}</p>
                </div>
                <p className="text-xl font-display font-bold text-white">
                  <StatValue loading={loading}>{value}</StatValue>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mass schedules ── */}
      {parish?.mass_schedules && parish.mass_schedules.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-olive" />
            <h2 className="font-display font-semibold text-sm text-foreground uppercase tracking-wide">Mass Schedule</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {parish.mass_schedules.filter(s => s.is_active).map(s => (
              <div key={s.id} className="bg-muted/40 rounded-lg p-3 border border-border/60 hover:border-olive/30 transition-colors">
                <p className="text-[10px] font-bold text-olive uppercase tracking-wide">{s.day_of_week}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{s.time}</p>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{s.mass_type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Upcoming events + Member status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Upcoming events */}
        <div className="bg-card rounded-xl border border-border overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-olive" />
              <h2 className="font-display font-semibold text-sm text-foreground">Upcoming Events</h2>
            </div>
            <button onClick={() => navigate('/events')}
              className="text-xs text-olive hover:text-olive-light transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {eventsLoading ? (
            <div className="divide-y divide-border">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted/60 rounded animate-pulse w-2/3" />
                    <div className="h-2.5 bg-muted/40 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-5">
              <CalendarDays className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {upcomingEvents.map(event => {
                const parts = fmtEventDate(event.event_date).split(' ');
                return (
                  <div key={event.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-olive/20 to-golden/10 border border-olive/20 flex flex-col items-center justify-center flex-shrink-0 group-hover:border-olive/40 transition-colors">
                      <span className="text-xs font-bold text-olive leading-none">{parts[1]}</span>
                      <span className="text-[9px] text-olive/60 uppercase tracking-wide">{parts[2]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {parts[0].replace(',', '')}
                        {event.start_time && ` · ${event.start_time}`}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                    {!event.is_public && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full flex-shrink-0">Private</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Member status */}
        <div className="bg-card rounded-xl border border-border overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
            <Activity className="w-4 h-4 text-olive" />
            <h2 className="font-display font-semibold text-sm text-foreground">Member Status</h2>
          </div>
          {regLoading ? (
            <div className="divide-y divide-border">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="h-3 bg-muted/60 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-muted/40 rounded animate-pulse w-10" />
                </div>
              ))}
            </div>
          ) : !regStats ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">Stats unavailable.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {[
                { label: 'Total Parishioners',  value: regStats.total_parishioners,           dot: 'bg-indigo-500'  },
                { label: 'Verified',             value: regStats.total_verified,              dot: 'bg-emerald-500' },
                { label: 'Pending Verification', value: regStats.total_pending_verification,  dot: 'bg-amber-400'   },
                { label: 'Unverified',           value: regStats.total_unverified,            dot: 'bg-red-500'     },
                { label: 'With Church ID',       value: regStats.total_with_new_church_id,   dot: 'bg-sky-500'     },
                { label: 'Without Church ID',    value: regStats.total_without_new_church_id, dot: 'bg-slate-400'  },
              ].map(({ label, value, dot }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  <p className="flex-1 text-sm text-foreground">{label}</p>
                  <p className="text-sm font-bold text-foreground">{value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Analytics tab bar ── */}
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Tab: Demographics ── */}
      {activeTab === 'demographics' && (
        <div className="space-y-5">
          {statsLoading ? <TabSkeleton /> : !parishStats ? <Unavailable /> : (() => {
            const genderData = toChartData(parishStats.gender_distribution).map(d => ({ ...d, name: capitalize(d.name) }));
            const maritalData = toChartData(parishStats.marital_status_distribution).map(d => ({ ...d, name: capitalize(d.name) }));
            const ageData = toChartData(parishStats.age_group_distribution);
            const birthDayData = toChartData(parishStats.day_of_week_born_distribution);
            const male = parishStats.gender_distribution['male'] ?? 0;
            const female = parishStats.gender_distribution['female'] ?? 0;
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Parishioners', value: parishStats.total_parishioners, color: 'text-foreground' },
                    { label: 'Male',               value: male,                           color: 'text-sky-600'    },
                    { label: 'Female',             value: female,                         color: 'text-rose-500'   },
                    { label: 'Other / Unknown',    value: parishStats.total_parishioners - male - female, color: 'text-slate-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
                      <p className={`text-3xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <ChartCard title="Gender Distribution" icon={Users}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {genderData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Marital Status" icon={Users2}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={maritalData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {maritalData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-muted-foreground capitalize">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  {ageData.length > 0 && (
                    <ChartCard title="Age Groups" icon={BarChart3} className="sm:col-span-2">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={ageData} barSize={32}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {ageData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}
                  {birthDayData.length > 0 && (
                    <ChartCard title="Birth Day of Week" icon={BarChart3} className="sm:col-span-2">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={birthDayData} barSize={36}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                          <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
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
          {statsLoading ? <TabSkeleton /> : !parishStats ? <Unavailable /> : (() => {
            const inSociety = parishStats.parishioners_in_societies ?? 0;
            const withoutSociety = parishStats.parishioners_without_society ?? 0;
            const coveragePct = parishStats.total_parishioners > 0
              ? Math.round((inSociety / parishStats.total_parishioners) * 100) : 0;
            const societyData = toChartData(parishStats.society_distribution)
              .sort((a, b) => b.value - a.value)
              .slice(0, 15);
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Societies',      value: parishStats.total_societies, suffix: '',  color: 'text-foreground'  },
                    { label: 'In a Society',          value: inSociety,                  suffix: '',  color: 'text-indigo-600'  },
                    { label: 'Society Coverage',      value: coveragePct,                suffix: '%', color: 'text-emerald-600' },
                    { label: 'No Society',            value: withoutSociety,             suffix: '',  color: 'text-slate-500'   },
                  ].map(({ label, value, suffix, color }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
                      <p className={`text-3xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}{suffix}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                {societyData.length > 0 && (
                  <ChartCard title="Members per Society" icon={BookMarked}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={societyData} barSize={24}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {societyData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
                {societyData.length > 0 && (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold text-foreground">Society Breakdown ({societyData.length})</h3>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border">
                          <tr>
                            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Society</th>
                            <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide">Members</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {societyData.map((s, i) => (
                            <tr key={s.name} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2.5 text-muted-foreground/50">{i + 1}</td>
                              <td className="px-4 py-2.5 font-medium text-foreground">{s.name}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-foreground">{s.value.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Communities ── */}
      {activeTab === 'communities' && (
        <div className="space-y-5">
          {statsLoading ? <TabSkeleton /> : !parishStats ? <Unavailable /> : (() => {
            const commData = toChartData(parishStats.church_community_distribution)
              .sort((a, b) => b.value - a.value);
            const totalInComm = commData.reduce((s, c) => s + c.value, 0);
            const coveragePct = parishStats.total_parishioners > 0
              ? Math.round((totalInComm / parishStats.total_parishioners) * 100) : 0;
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Communities',    value: parishStats.total_church_communities, suffix: '',  color: 'text-foreground'  },
                    { label: 'Community Members',    value: totalInComm,                          suffix: '',  color: 'text-indigo-600'  },
                    { label: 'Community Coverage',   value: coveragePct,                          suffix: '%', color: 'text-emerald-600' },
                    { label: 'Communities w/ Members', value: commData.filter(c => c.value > 0).length, suffix: '', color: 'text-sky-600' },
                  ].map(({ label, value, suffix, color }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
                      <p className={`text-3xl font-bold ${color}`}>{(value ?? 0).toLocaleString()}{suffix}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                {commData.length > 0 && (
                  <ChartCard title="Community Distribution" icon={Users2}>
                    <ResponsiveContainer width="100%" height={Math.max(260, commData.length * 36)}>
                      <BarChart data={commData} layout="vertical" barSize={18}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={140} />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {commData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Sacraments ── */}
      {activeTab === 'sacraments' && (
        <div className="space-y-5">
          {statsLoading ? <TabSkeleton /> : !parishStats ? <Unavailable /> : (() => {
            const sacData = toChartData(parishStats.sacraments_distribution)
              .sort((a, b) => b.value - a.value);
            const total = parishStats.total_parishioners;
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sacData.map(({ name, value }) => {
                    const meta = SACRAMENT_META[name] ?? { icon: '✝️', palette: '#6366f1', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={name} className={`border rounded-xl p-4 ${meta.bg} ${meta.border}`}>
                        <div className="text-2xl mb-2">{meta.icon}</div>
                        <p className={`text-2xl font-bold leading-none ${meta.text}`}>{value.toLocaleString()}</p>
                        <p className={`text-xs font-semibold mt-0.5 ${meta.text} opacity-70`}>{pct}% of parishioners</p>
                        <p className={`text-sm font-medium mt-1 leading-tight ${meta.text}`}>{name}</p>
                      </div>
                    );
                  })}
                </div>
                {sacData.length > 0 && (
                  <ChartCard title="Sacraments Overview" icon={Heart}>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={sacData} barSize={28}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                          tickFormatter={v => v.replace('Anointing of the Sick', 'Anointing').replace('Holy ', '')} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {sacData.map((d, i) => {
                            const meta = SACRAMENT_META[d.name];
                            return <Cell key={i} fill={meta?.palette ?? PALETTE[i % PALETTE.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Registration ── */}
      {activeTab === 'registration' && (
        <div className="space-y-5">
          {regLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
                </div>
              ))}
            </div>
          ) : !regStats ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">Registration statistics unavailable.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Parishioners',   value: regStats.total_parishioners,           color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-100'  },
                { label: 'Verified',              value: regStats.total_verified,              color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                { label: 'Pending Verification',  value: regStats.total_pending_verification,  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
                { label: 'Unverified',            value: regStats.total_unverified,            color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-100'     },
                { label: 'With Church ID',        value: regStats.total_with_new_church_id,   color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-100'     },
                { label: 'Without Church ID',     value: regStats.total_without_new_church_id, color: 'text-slate-500',  bg: 'bg-slate-50',   border: 'border-slate-200'   },
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
          )}
        </div>
      )}

    </div>
  );
}
