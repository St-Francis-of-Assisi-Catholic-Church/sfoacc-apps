import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import {
  RefreshCw, Search, X, CheckCircle2, MailCheck, MessageSquare,
  IdCard, AlertTriangle, Clock, ShieldCheck, Users,
} from 'lucide-react';
import { Button } from '../../components/ui';
import type { Parishioner } from '@sfoacc/sdk';

type Tab = 'no_church_id' | 'unverified' | 'pending' | 'all';

interface Stats {
  total_parishioners: number;
  total_verified: number;
  total_pending_verification: number;
  total_unverified: number;
  total_with_new_church_id: number;
  total_without_new_church_id: number;
}

const PAGE_SIZE = 50;

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  );
}

interface ChurchUnitOption { id: number; name: string; type: string }

export default function Registration() {
  const client = useSDK();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [parishioners, setParishioners] = useState<Parishioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('no_church_id');
  const [search, setSearch] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [churchUnits, setChurchUnits] = useState<ChurchUnitOption[]>([]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState<Set<string>>(new Set());

  useEffect(() => {
    client.listChurchUnitsPublic()
      .then(r => {
        const items = Array.isArray(r.data) ? r.data : (r.data as { items?: ChurchUnitOption[] })?.items ?? [];
        setChurchUnits(items as ChurchUnitOption[]);
      })
      .catch(() => {});
  }, [client]);

  const loadStats = useCallback(() => {
    return client.getRegistrationStats()
      .then(r => setStats(r.data as Stats))
      .catch(() => {});
  }, [client]);

  const loadParishioners = useCallback((manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    const filters: Record<string, unknown> = { limit: 500 };
    if (tab === 'unverified') filters.verification_status = 'unverified';
    else if (tab === 'pending') filters.verification_status = 'pending';
    if (filterUnit) filters.church_unit_id = Number(filterUnit);
    // no_church_id and all: fetch a broad set and filter client-side
    return client.listParishioners(filters as Parameters<typeof client.listParishioners>[0])
      .then(r => {
        const raw = r.data as Parishioner[] | { items?: Parishioner[] } | null;
        const list: Parishioner[] = Array.isArray(raw) ? raw : (raw as { items?: Parishioner[] })?.items ?? [];
        setParishioners(list);
        if (manual) toast.success('Refreshed');
      })
      .catch(err => toastApiError(err, 'Failed to load'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client, tab, filterUnit]);

  useEffect(() => {
    setSelected(new Set());
    setPage(0);
    Promise.all([loadStats(), loadParishioners()]);
  }, [tab, filterUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = parishioners.filter(p => {
    const name = [p.first_name, p.other_names, p.last_name].filter(Boolean).join(' ').toLowerCase();
    const q = search.toLowerCase();
    if (q && !name.includes(q) && !(p.email_address ?? '').toLowerCase().includes(q) && !(p.mobile_number ?? '').includes(q)) return false;
    if (tab === 'no_church_id') return !p.new_church_id;
    if (tab === 'all') return !p.new_church_id || p.verification_status !== 'verified';
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allOnPageSelected = paged.length > 0 && paged.every(p => selected.has(p.id));

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(s => { const n = new Set(s); paged.forEach(p => n.delete(p.id)); return n; });
    } else {
      setSelected(s => { const n = new Set(s); paged.forEach(p => n.add(p.id)); return n; });
    }
  };

  const markActing = (ids: string[]) => setActing(s => { const n = new Set(s); ids.forEach(id => n.add(id)); return n; });
  const unmarkActing = (ids: string[]) => setActing(s => { const n = new Set(s); ids.forEach(id => n.delete(id)); return n; });

  const sendVerification = async (ids: string[], channel: 'email' | 'sms' | 'both' = 'email') => {
    markActing(ids);
    try {
      const res = await client.sendBatchVerification({ parishioner_ids: ids, channel });
      const { sent = 0, skipped = 0 } = res.data ?? {};
      if (sent > 0) toast.success(`Verification sent to ${sent} parishioner${sent !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped — no contact info)` : ''}`);
      else toast.warning(`No verifications sent — ${skipped} skipped (no contact info)`);
    } catch (err) {
      toastApiError(err, 'Failed to send verification');
    } finally {
      unmarkActing(ids);
      setSelected(new Set());
    }
  };

  const sendVerificationAll = async (channel: 'email' | 'sms' | 'both') => {
    const scopeLabel = filterUnit ? ` (${churchUnits.find(u => String(u.id) === filterUnit)?.name ?? 'selected unit'})` : ' (all parishes)';
    try {
      const payload: Parameters<typeof client.sendBatchVerification>[0] = {
        send_to_all_unverified: true,
        channel,
        ...(filterUnit ? { church_unit_id: Number(filterUnit) } : {}),
      };
      const res = await client.sendBatchVerification(payload);
      const { sent = 0, skipped = 0 } = res.data ?? {};
      toast.success(`Sent to ${sent} parishioner${sent !== 1 ? 's' : ''}${scopeLabel}${skipped > 0 ? `, ${skipped} skipped` : ''}`);
      await loadStats();
    } catch (err) {
      toastApiError(err, 'Failed to send verification');
    }
  };

  const generateChurchId = async (p: Parishioner) => {
    markActing([p.id]);
    try {
      const res = await client.generateChurchId(p.id, p.old_church_id ?? '', { send_email: true });
      const newId = (res.data as { new_church_id?: string })?.new_church_id;
      toast.success(`Church ID generated${newId ? `: ${newId}` : ''}`);
      await Promise.all([loadStats(), loadParishioners()]);
    } catch (err) {
      toastApiError(err, 'Failed to generate Church ID');
    } finally {
      unmarkActing([p.id]);
    }
  };

  const bulkGenerateIds = async () => {
    const ids = Array.from(selected);
    const targets = parishioners.filter(p => ids.includes(p.id) && !p.new_church_id);
    if (!targets.length) { toast.error('No selected parishioners need a church ID'); return; }
    markActing(targets.map(p => p.id));
    let ok = 0;
    await Promise.allSettled(targets.map(p =>
      client.generateChurchId(p.id, p.old_church_id ?? '', { send_email: true })
        .then(() => { ok++; })
        .catch(() => {})
    ));
    unmarkActing(targets.map(p => p.id));
    if (ok > 0) {
      toast.success(`Generated ${ok} new church ID${ok !== 1 ? 's' : ''}`);
      await Promise.all([loadStats(), loadParishioners()]);
    }
    setSelected(new Set());
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'no_church_id', label: 'No Church ID', icon: IdCard, count: stats?.total_without_new_church_id },
    { id: 'unverified', label: 'Unverified', icon: AlertTriangle, count: stats?.total_unverified },
    { id: 'pending', label: 'Pending', icon: Clock, count: stats?.total_pending_verification },
    { id: 'all', label: 'All Issues', icon: Users },
  ];

  const statusBadge = (s: string | null | undefined) => {
    if (!s) return null;
    const map: Record<string, string> = {
      verified: 'bg-emerald-50 text-emerald-700',
      pending: 'bg-amber-50 text-amber-700',
      unverified: 'bg-red-50 text-red-600',
    };
    return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${map[s] ?? 'bg-muted text-muted-foreground'}`}>{s}</span>;
  };

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Registration & Data Quality</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Church ID coverage, verification status, and bulk actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadParishioners(true)} disabled={refreshing} title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Total Parishioners" value={stats.total_parishioners} icon={Users} color="bg-navy/10 text-navy" />
          <StatCard label="Verified" value={stats.total_verified}
            sub={`${Math.round(stats.total_verified / Math.max(stats.total_parishioners, 1) * 100)}%`}
            icon={ShieldCheck} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Pending" value={stats.total_pending_verification} icon={Clock} color="bg-amber-50 text-amber-600" />
          <StatCard label="Unverified" value={stats.total_unverified} icon={AlertTriangle} color="bg-red-50 text-red-600" />
          <StatCard label="With Church ID" value={stats.total_with_new_church_id} icon={CheckCircle2} color="bg-blue-50 text-blue-600" />
          <StatCard label="No Church ID" value={stats.total_without_new_church_id} icon={IdCard} color="bg-orange-50 text-orange-600" />
        </div>
      )}

      {/* Tabs + Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-border overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-navy text-navy' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  tab === t.id ? 'bg-navy/10 text-navy' : 'bg-muted text-muted-foreground'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-muted/10">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search by name, email, phone…"
              className="w-full pl-8 pr-7 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Church unit filter */}
          {churchUnits.length > 0 && (
            <select value={filterUnit} onChange={e => { setFilterUnit(e.target.value); setPage(0); }}
              className="px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[180px]">
              <option value="">All units</option>
              {churchUnits.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>
          )}

          <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Send-to-all (no selection needed) */}
            {(tab === 'unverified' || tab === 'pending') && selected.size === 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => sendVerificationAll('email')} title={`Email${filterUnit ? '' : ' All'}`}>
                  <MailCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Email{filterUnit ? '' : ' All'}</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => sendVerificationAll('sms')} title={`SMS${filterUnit ? '' : ' All'}`}>
                  <MessageSquare className="w-3.5 h-3.5" /> <span className="hidden sm:inline">SMS{filterUnit ? '' : ' All'}</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => sendVerificationAll('both')} title={`Both${filterUnit ? '' : ' All'}`}>
                  <span className="hidden sm:inline">Both{filterUnit ? '' : ' All'}</span>
                </Button>
              </>
            )}

            {/* Bulk actions when rows selected */}
            {selected.size > 0 && (
              <>
                <span className="text-xs font-medium text-foreground">{selected.size} selected</span>
                {(tab === 'unverified' || tab === 'pending' || tab === 'all') && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => sendVerification(Array.from(selected), 'email')} title="Email">
                      <MailCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Email</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendVerification(Array.from(selected), 'sms')} title="SMS">
                      <MessageSquare className="w-3.5 h-3.5" /> <span className="hidden sm:inline">SMS</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendVerification(Array.from(selected), 'both')} title="Both">
                      <span className="hidden sm:inline">Both</span>
                    </Button>
                  </>
                )}
                {(tab === 'no_church_id' || tab === 'all') && (
                  <Button size="sm" onClick={bulkGenerateIds} title="Generate IDs">
                    <IdCard className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Generate IDs</span>
                  </Button>
                )}
                <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No issues found</p>
            <p className="text-xs text-muted-foreground mt-1">All parishioners in this category are up to date.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-border accent-navy cursor-pointer" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parishioner</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Church ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Verification</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Contact</th>
                <th className="px-4 py-2.5 w-44 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map(p => {
                const name = [p.first_name, p.other_names, p.last_name].filter(Boolean).join(' ');
                const isActing = acting.has(p.id);
                return (
                  <tr key={p.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/parishioners/${p.id}`)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(p.id)}
                        onChange={() => setSelected(s => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                        className="w-3.5 h-3.5 rounded border-border accent-navy cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-sm">{name}</p>
                      {p.email_address && <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{p.email_address}</p>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.new_church_id ? (
                        <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">{p.new_church_id}</span>
                      ) : p.old_church_id ? (
                        <span className="font-mono text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded" title="Old ID only">{p.old_church_id}</span>
                      ) : (
                        <span className="text-xs text-red-500 font-medium">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {statusBadge(p.verification_status)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {p.mobile_number ?? p.email_address ?? '—'}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {p.verification_status !== 'verified' && (
                          <>
                            <button
                              disabled={isActing}
                              onClick={() => sendVerification([p.id], 'email')}
                              title="Send verification email"
                              className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-navy hover:bg-navy/10 transition-colors disabled:opacity-40"
                            >
                              <MailCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => sendVerification([p.id], 'sms')}
                              title="Send verification SMS"
                              className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-navy hover:bg-navy/10 transition-colors disabled:opacity-40"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {!p.new_church_id && (
                          <button
                            disabled={isActing}
                            onClick={() => generateChurchId(p)}
                            title="Generate new Church ID"
                            className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-40 flex items-center gap-1"
                          >
                            <IdCard className="w-3.5 h-3.5" />
                            {isActing ? <span className="text-[10px]">…</span> : null}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-2.5 py-1 border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-2.5 py-1 border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
