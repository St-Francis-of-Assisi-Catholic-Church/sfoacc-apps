import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAppConfig } from '../../contexts/AppConfigContext';
import {
  Building2, Users, Users2, BookMarked,
  TrendingUp, ArrowRight, CheckCircle, Clock, ShieldCheck,
} from 'lucide-react';

type Stat = { label: string; value: number; icon: React.ElementType; color: string; bg: string; path: string };

function StatCard({ label, value, icon: Icon, color, bg, path }: Stat) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      className="bg-card border border-border rounded-xl p-5 flex items-center gap-4 hover:shadow-md hover:border-navy/20 transition-all group text-left w-full"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-foreground leading-tight">
          {value === -1 ? <span className="text-muted-foreground text-base animate-pulse">Loading…</span> : value.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-navy/50 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard() {
  const client = useSDK();
  const { user } = useAdminAuth();
  const { config } = useAppConfig();

  const [outstations, setOutstations] = useState(-1);
  const [societies, setSocieties] = useState(-1);
  const [communities, setCommunities] = useState(-1);
  const [totalParishioners, setTotalParishioners] = useState(-1);
  const [verifiedParishioners, setVerifiedParishioners] = useState(-1);
  const [recentParishioners, setRecentParishioners] = useState<Array<{ id: string; full_name: string; church_id?: string }>>([]);
  const [churchUnits, setChurchUnits] = useState<Array<{ id: number; name: string; type: string }>>([]);

  useEffect(() => {
    client.listOutstations().then(r => {
      setOutstations(r.data?.total ?? r.data?.items?.length ?? 0);
    }).catch(() => setOutstations(0));

    client.listSocieties().then(r => {
      setSocieties(r.data?.total ?? r.data?.items?.length ?? 0);
    }).catch(() => setSocieties(0));

    client.listCommunities().then(r => {
      setCommunities(r.data?.total ?? r.data?.items?.length ?? 0);
    }).catch(() => setCommunities(0));

    client.getParishionerStats().then(r => {
      setTotalParishioners(r.data?.total ?? 0);
      setVerifiedParishioners(r.data?.verified ?? 0);
    }).catch(() => {
      client.listParishioners({ limit: 1, offset: 0 }).then(r => {
        setTotalParishioners(r.data?.total ?? 0);
        setVerifiedParishioners(0);
      }).catch(() => { setTotalParishioners(0); setVerifiedParishioners(0); });
    });

    client.listParishioners({ limit: 6, offset: 0 }).then(r => {
      setRecentParishioners(r.data?.items ?? []);
    }).catch(() => {});

    client.listChurchUnitsPublic().then(r => {
      setChurchUnits(r.data ?? []);
    }).catch(() => {});
  }, [client]);

  const STAT_CARDS: Stat[] = [
    { label: 'Total Outstations',  value: outstations,       icon: Building2,  color: 'text-navy',        bg: 'bg-navy/8',     path: '/admin/church-units'  },
    { label: 'Total Societies',     value: societies,         icon: BookMarked, color: 'text-sky-600',     bg: 'bg-sky-50',     path: '/admin/societies'     },
    { label: 'Church Communities',  value: communities,       icon: Users2,     color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/admin/communities'   },
    { label: 'Total Parishioners',  value: totalParishioners, icon: Users,      color: 'text-violet-600',  bg: 'bg-violet-50',  path: '/admin/parishioners'  },
  ];

  const verifiedPct = totalParishioners > 0
    ? Math.round((verifiedParishioners / totalParishioners) * 100)
    : 0;

  const now = new Date();
  const dateStr = `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin';

  return (
    <div className="space-y-6">

      {/* ── Welcome card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] border border-white/[0.07] p-7 shadow-lg">
        {/* Dot texture */}
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.06) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-violet-500/15 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-indigo-600/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-1">
                <ShieldCheck className="w-3 h-3 text-violet-300" />
                <span className="text-violet-300 text-[10px] font-semibold tracking-widest uppercase">Super Admin</span>
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold text-white leading-tight">
              {getGreeting()}, {firstName}.
            </h1>
            <p className="text-white/45 text-sm mt-1">{config.name || 'Church Management System'}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm font-medium">{dateStr}</p>
            <p className="text-white/30 text-xs mt-0.5">
              {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Stats summary row */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.07]">
          {[
            { label: 'Outstations',   value: outstations },
            { label: 'Societies',     value: societies },
            { label: 'Communities',   value: communities },
            { label: 'Parishioners',  value: totalParishioners },
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

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Bottom panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Verification progress */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-sm">Verification Status</h2>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Verified parishioners</span>
                <span className="font-semibold text-foreground">{verifiedPct}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-navy to-navy-light rounded-full transition-all duration-700"
                  style={{ width: `${verifiedPct}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {verifiedParishioners === -1 ? '—' : verifiedParishioners.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> Verified
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {totalParishioners === -1 ? '—' : Math.max(0, totalParishioners - verifiedParishioners).toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-amber-500" /> Pending
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Church units list */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-sm">Church Units</h2>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          {churchUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : (
            <div className="divide-y divide-border">
              {churchUnits.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.type === 'parish' ? 'bg-navy' : 'bg-navy-light'}`} />
                  <span className="text-sm text-foreground flex-1 truncate">{u.name}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    u.type === 'parish' ? 'bg-navy/10 text-navy' : 'bg-muted text-muted-foreground'
                  }`}>{u.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent parishioners */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-sm">Recent Parishioners</h2>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          {recentParishioners.length === 0 ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
          ) : (
            <div className="divide-y divide-border">
              {recentParishioners.map(p => (
                <div key={p.id} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                  <div className="w-7 h-7 rounded-full bg-navy/10 border border-navy/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-navy text-xs font-semibold">{p.full_name?.charAt(0) ?? '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.full_name}</p>
                    {p.church_id && <p className="text-[10px] text-muted-foreground">{p.church_id}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
