import { useAuth } from '../contexts/AuthContext';
import { useSDK } from '../contexts/SDKContext';
import { useParish, useParishioners, useSocieties } from '@sfoacc/sdk';
import { Users, MapPin, Banknote, CalendarDays, Activity, Church, ArrowUpRight } from 'lucide-react';
import { Badge } from '../components/ui';

function StatValue({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (loading) return <span className="inline-block w-16 h-6 bg-white/10 rounded animate-pulse" />;
  return <>{children}</>;
}

function StatValueLight({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  if (loading) return <span className="inline-block w-14 h-6 bg-muted/60 rounded animate-pulse" />;
  return <>{children}</>;
}

// Decorative church window SVG
function ChurchWindowDecor() {
  return (
    <svg viewBox="0 0 180 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <path d="M90 8 Q172 8 172 90 L172 252 L8 252 L8 90 Q8 8 90 8Z"
        stroke="#b8963e" strokeWidth="1.5" fill="none" />
      <path d="M90 28 Q152 28 152 100 L152 236 L28 236 L28 100 Q28 28 90 28Z"
        stroke="#b8963e" strokeWidth="1" fill="none" />
      <line x1="90" y1="8" x2="90" y2="252" stroke="#b8963e" strokeWidth="1" />
      <line x1="8" y1="130" x2="172" y2="130" stroke="#b8963e" strokeWidth="1" />
      <circle cx="90" cy="130" r="28" stroke="#b8963e" strokeWidth="1" fill="none" />
      <circle cx="90" cy="130" r="16" stroke="#b8963e" strokeWidth="0.5" fill="none" />
      <path d="M90 102 L90 78" stroke="#b8963e" strokeWidth="1" />
      <path d="M78 114 L62 114" stroke="#b8963e" strokeWidth="1" />
    </svg>
  );
}

const upcomingEvents = [
  { name: 'Sunday Mass', date: 'Sun, Mar 16', time: '8:00 AM', type: 'Mass' },
  { name: 'Stations of the Cross', date: 'Fri, Mar 21', time: '6:00 PM', type: 'Devotion' },
  { name: 'Choir Rehearsal', date: 'Sat, Mar 22', time: '4:00 PM', type: 'Ministry' },
  { name: 'Palm Sunday Mass', date: 'Sun, Mar 23', time: '8:00 AM & 10:30 AM', type: 'Mass' },
];

const recentActivity = [
  { action: 'New member registered', detail: 'Mrs. Adaeze Okonkwo', time: '2h ago' },
  { action: 'Baptism scheduled', detail: 'Baby Emmanuel Chukwu', time: '5h ago' },
  { action: 'Collection recorded', detail: 'Sunday 2nd Collection — ₦180,000', time: '1d ago' },
  { action: 'Marriage banns published', detail: 'Mr. Emeka & Miss. Chioma', time: '2d ago' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const client = useSDK();

  const { data: parish, isLoading: pLoading } = useParish(client);
  const { data: parishionersData, isLoading: mLoading } = useParishioners(client, { limit: 1 });
  const { data: societiesData, isLoading: sLoading } = useSocieties(client, { limit: 1 });

  const totalMembers = parishionersData?.total ?? 0;
  const totalSocieties = societiesData?.total ?? 0;
  const outstationCount = parish?.outstations?.length ?? 0;

  return (
    <div className="space-y-5">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-navy-dark via-navy to-navy-light">
        {/* Dot pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(184,150,62,0.08) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        {/* Glow blobs */}
        <div className="absolute -top-12 left-1/3 w-56 h-56 bg-olive/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-8 right-1/4 w-40 h-40 bg-golden/8 blur-2xl rounded-full pointer-events-none" />
        {/* Church window decor */}
        <div className="absolute right-0 top-0 h-full w-48 opacity-[0.07] pointer-events-none">
          <ChurchWindowDecor />
        </div>
        {/* Gold bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-olive/50 to-transparent" />

        <div className="relative z-10 px-7 py-6">
          <p className="text-olive/70 text-xs font-medium uppercase tracking-widest mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-display font-bold text-white mb-1">
            Welcome back, {user?.full_name?.split(' ')[0] ?? 'Administrator'}
          </h1>
          <p className="text-white/35 text-sm">
            {parish?.name ?? 'Saints Francis of Assisi Catholic Church'} · Parish Management Portal
          </p>

          {/* Inline hero stats */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Members', value: totalMembers.toLocaleString(), loading: mLoading, icon: Users },
              { label: 'Societies', value: String(totalSocieties), loading: sLoading, icon: Church },
              { label: 'Outstations', value: String(outstationCount), loading: pLoading, icon: MapPin },
              { label: 'Collections', value: '₦2.4M', loading: false, icon: Banknote },
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
            {parish.mass_schedules.filter(s => s.is_active).map((s) => (
              <div key={s.id} className="bg-muted/40 rounded-lg p-3 border border-border/60 hover:border-olive/30 transition-colors">
                <p className="text-[10px] font-bold text-olive uppercase tracking-wide">{s.day_of_week}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{s.time}</p>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{s.mass_type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Upcoming events */}
        <div className="bg-card rounded-xl border border-border overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-olive" />
              <h2 className="font-display font-semibold text-sm text-foreground">Upcoming Events</h2>
            </div>
            <button className="text-xs text-olive hover:text-olive-light transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {upcomingEvents.map((event) => (
              <div key={event.name}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-olive/20 to-golden/10 border border-olive/20 flex flex-col items-center justify-center flex-shrink-0 group-hover:border-olive/40 transition-colors">
                  <span className="text-xs font-bold text-olive leading-none">{event.date.split(' ')[1]}</span>
                  <span className="text-[9px] text-olive/60 uppercase tracking-wide">{event.date.split(' ')[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                </div>
                <Badge variant="default" className="flex-shrink-0 text-[10px]">{event.type}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-card rounded-xl border border-border overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/20">
            <Activity className="w-4 h-4 text-olive" />
            <h2 className="font-display font-semibold text-sm text-foreground">Recent Activity</h2>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-olive mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{item.action}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 mt-0.5">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick stats row ── */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Members', value: totalMembers, icon: Users, loading: mLoading },
          { label: 'Societies', value: totalSocieties, icon: Church, loading: sLoading },
          { label: 'Outstations', value: outstationCount, icon: MapPin, loading: pLoading },
          { label: 'Events this Month', value: 9, icon: CalendarDays, loading: false },
          { label: 'Pending Actions', value: 3, icon: Activity, loading: false },
        ].map(({ label, value, icon: Icon, loading }) => (
          <div key={label} className="bg-card/60 rounded-lg px-4 py-3 border border-border/60 flex items-center gap-3 hover:border-olive/20 transition-colors">
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide truncate">{label}</p>
              <p className="text-lg font-display font-bold text-foreground leading-tight">
                <StatValueLight loading={loading}>{value.toLocaleString()}</StatValueLight>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
