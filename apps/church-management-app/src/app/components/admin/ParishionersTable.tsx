import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import {
  ChevronLeft, ChevronRight, RefreshCw, Plus, Download,
  ChevronDown, Search, X, SlidersHorizontal,
  MessageSquare, ToggleLeft, ShieldCheck, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError, extractApiError } from '../../utils/apiError';
import { Button } from '../ui';
import { ChurchUnitSelect } from './ChurchUnitSelect';
import { SendMessageModal } from './SendMessageModal';
import type { ChurchCommunity, Gender, MaritalStatus, MembershipStatus, VerificationStatus } from '@sfoacc/sdk';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ParishionerRow = {
  id: string;
  first_name: string;
  other_names?: string | null;
  last_name: string;
  title?: string | null;
  baptismal_name?: string | null;
  maiden_name?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  place_of_birth?: string | null;
  hometown?: string | null;
  region?: string | null;
  country?: string | null;
  current_residence?: string | null;
  nationality?: string | null;
  mobile_number?: string | null;
  whatsapp_number?: string | null;
  email_address?: string | null;
  marital_status?: string | null;
  old_church_id?: string | null;
  new_church_id?: string | null;
  membership_status?: string | null;
  verification_status?: string | null;
  is_deceased?: boolean | null;
  created_at?: string | null;
};

export interface ParishFilters {
  search: string;
  gender: string;
  marital_status: string;
  membership_status: string;
  verification_status: string;
  church_unit_id: string;
  church_community_id: string;
  has_new_church_id: string;
  date_from: string;
  date_to: string;
}

export const EMPTY_FILTERS: ParishFilters = {
  search: '', gender: '', marital_status: '', membership_status: '',
  verification_status: '', church_unit_id: '', church_community_id: '',
  has_new_church_id: '', date_from: '', date_to: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export function displayParishionerName(p: ParishionerRow) {
  return [p.first_name, p.other_names, p.last_name].filter(Boolean).join(' ') || '—';
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcAge(dob: string | null | undefined) {
  if (!dob) return null;
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return isNaN(age) || age < 0 ? null : age;
}

const SEL = 'px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer appearance-none pr-7';
const INP = 'px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all';

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${color}`}>
      {children}
    </span>
  );
}

function MembershipBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<string, string> = { active: 'bg-emerald-50 text-emerald-700', deceased: 'bg-gray-100 text-gray-600', disabled: 'bg-red-50 text-red-600' };
  return <Badge color={map[status] ?? 'bg-muted text-muted-foreground'}>{status}</Badge>;
}

function VerificationBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<string, string> = { verified: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700', unverified: 'bg-red-50 text-red-600' };
  return <Badge color={map[status] ?? 'bg-muted text-muted-foreground'}>{status}</Badge>;
}

// ── Filter panel ──────────────────────────────────────────────────────────────

function FilterPanel({
  filters, communities, onChange, sortBy, onSortChange,
  showUnitFilter, selectionCount = 0, onClearSelection, accent,
}: {
  filters: ParishFilters; communities: ChurchCommunity[];
  onChange: (f: ParishFilters) => void; sortBy: string; onSortChange: (v: string) => void;
  showUnitFilter: boolean; selectionCount?: number; onClearSelection?: () => void;
  accent: string;
}) {
  const [search, setSearch] = useState(filters.search);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => onChange({ ...filters, search }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const set = (patch: Partial<ParishFilters>) => onChange({ ...filters, ...patch });
  const hasActive = Object.values(filters).some(v => v !== '');
  const clearAll = () => { setSearch(''); onChange(EMPTY_FILTERS); };

  const hasMoreActive = filters.gender || filters.membership_status || filters.verification_status
    || filters.marital_status || filters.has_new_church_id || filters.church_community_id
    || filters.date_from || filters.date_to;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, email…"
              className={`${INP} w-full pl-9 pr-8`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Church unit (admin only) */}
          {showUnitFilter && (
            <div className="relative">
              <ChurchUnitSelect
                value={filters.church_unit_id}
                onChange={v => set({ church_unit_id: v, church_community_id: '' })}
                className={`${SEL} min-w-[170px]`}
              />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {hasActive && (
            <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted transition-all">
              <X className="w-3.5 h-3.5" /><span className="hidden sm:inline text-xs">Clear all</span>
            </button>
          )}
          <button
            onClick={() => setMoreOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-all ${
              moreOpen || hasMoreActive
                ? `border-${accent}/40 bg-${accent}/5 text-${accent}`
                : 'border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs font-medium">More filters</span>
            {!!hasMoreActive && <span className={`w-1.5 h-1.5 rounded-full bg-${accent} shrink-0`} />}
          </button>
          {selectionCount > 0 && (
            <button onClick={onClearSelection}
              className={`flex items-center gap-1.5 px-3 py-2 border border-${accent}/30 bg-${accent}/5 text-${accent} rounded-lg text-xs font-medium hover:bg-${accent}/10 transition-colors`}>
              <span>{selectionCount} selected</span>
              <X className="w-3 h-3 opacity-60" />
            </button>
          )}
        </div>
      </div>

      {moreOpen && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border">
          <div className="relative">
            <select value={filters.gender} onChange={e => set({ gender: e.target.value })} className={`${SEL} min-w-[110px]`}>
              <option value="">All genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filters.membership_status} onChange={e => set({ membership_status: e.target.value })} className={`${SEL} min-w-[140px]`}>
              <option value="">All memberships</option>
              <option value="active">Active</option>
              <option value="deceased">Deceased</option>
              <option value="disabled">Disabled</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filters.verification_status} onChange={e => set({ verification_status: e.target.value })} className={`${SEL} min-w-[140px]`}>
              <option value="">All verifications</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="unverified">Unverified</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filters.marital_status} onChange={e => set({ marital_status: e.target.value })} className={`${SEL} min-w-[140px]`}>
              <option value="">Marital status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="divorced">Divorced</option>
              <option value="separated">Separated</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filters.has_new_church_id} onChange={e => set({ has_new_church_id: e.target.value })} className={`${SEL} min-w-[160px]`}>
              <option value="">New Church ID?</option>
              <option value="yes">Has new Church ID</option>
              <option value="no">No new Church ID</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
          {communities.length > 0 && (
            <div className="relative">
              <select value={filters.church_community_id} onChange={e => set({ church_community_id: e.target.value })} className={`${SEL} min-w-[160px]`}>
                <option value="">All communities</option>
                {communities.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Created from</span>
            <input type="date" value={filters.date_from} onChange={e => set({ date_from: e.target.value })} className={`${INP} text-xs`} />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={filters.date_to} onChange={e => set({ date_to: e.target.value })} className={`${INP} text-xs`} />
            {(filters.date_from || filters.date_to) && (
              <button onClick={() => set({ date_from: '', date_to: '' })} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            )}
          </div>
          <div className="relative">
            <select value={sortBy} onChange={e => onSortChange(e.target.value)} className={`${SEL} min-w-[160px]`}>
              <option value="">Sort: Default</option>
              <option value="name_asc">Name A → Z</option>
              <option value="name_desc">Name Z → A</option>
              <option value="dob_asc">Date of Birth ↑</option>
              <option value="dob_desc">Date of Birth ↓</option>
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Column widths ─────────────────────────────────────────────────────────────

const COLS = [
  { w: 44  },
  { w: 220 }, { w: 80  }, { w: 80  }, { w: 110 }, { w: 55  },
  { w: 110 }, { w: 140 }, { w: 140 }, { w: 190 }, { w: 130 },
  { w: 120 }, { w: 100 }, { w: 160 }, { w: 110 }, { w: 130 },
  { w: 120 }, { w: 110 }, { w: 120 }, { w: 120 }, { w: 120 },
  { w: 120 }, { w: 90  }, { w: 120 }, { w: 80  },
] as const;

function TableColgroup() {
  return (
    <colgroup>
      {COLS.map((c, i) => <col key={i} style={{ minWidth: c.w, width: c.w }} />)}
    </colgroup>
  );
}

function TH({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function TD({ children, className = '', title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <td className={`px-4 py-3 text-sm whitespace-nowrap ${className}`} title={title}>
      {children}
    </td>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface ParishionersTableProps {
  /** Base navigation path, e.g. '/admin/parishioners' or '/members' */
  basePath: string;
  /** If provided, shows the Add button and navigates here */
  addPath?: string;
  /** localStorage key for Bearer token used in CSV export */
  tokenKey?: 'admin_token' | 'auth_token';
  /** Unit ID to scope requests (portal: selectedUnit?.id) */
  unitId?: number;
  /** Show church unit dropdown in filters (admin only) */
  showUnitFilter?: boolean;
  /** Permission gates */
  canAdd?: boolean;
  canMessage?: boolean;
  canWrite?: boolean;
  canExport?: boolean;
  /** Tailwind color name for accent (e.g. 'navy', 'olive') */
  accentColor?: string;
  /** Extra buttons to render in the header action row (e.g. Bulk Import) */
  extraHeaderButtons?: React.ReactNode;
  /** Called when data loads, useful for parent to know total */
  onLoad?: (total: number) => void;
}

export function ParishionersTable({
  basePath,
  addPath,
  tokenKey = 'auth_token',
  unitId,
  showUnitFilter = false,
  canAdd = true,
  canMessage = true,
  canWrite = true,
  canExport = true,
  accentColor = 'navy',
  extraHeaderButtons,
}: ParishionersTableProps) {
  const client = useSDK();
  const navigate = useNavigate();

  const [rawItems, setRawItems] = useState<ParishionerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ParishFilters>(EMPTY_FILTERS);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [sortBy, setSortBy] = useState('');
  const [communities, setCommunities] = useState<ChurchCommunity[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [msgOpen, setMsgOpen] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [membershipMenuOpen, setMembershipMenuOpen] = useState(false);
  const [verifyMenuOpen, setVerifyMenuOpen] = useState(false);
  const membershipMenuRef = useRef<HTMLDivElement>(null);
  const verifyMenuRef = useRef<HTMLDivElement>(null);

  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onBodyScroll = useCallback(() => {
    if (headRef.current && bodyRef.current) headRef.current.scrollLeft = bodyRef.current.scrollLeft;
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (membershipMenuRef.current && !membershipMenuRef.current.contains(e.target as Node)) setMembershipMenuOpen(false);
      if (verifyMenuRef.current && !verifyMenuRef.current.contains(e.target as Node)) setVerifyMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    client.listCommunities({ limit: 200 })
      .then(r => setCommunities(r.data?.items ?? []))
      .catch(() => {});
  }, [client]);

  useEffect(() => { setPage(0); setSelectedIds(new Set()); }, [unitId]);

  const load = useCallback((f: ParishFilters, p: number, manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setErrorMsg(null);
    (client.listParishioners as Function)({
      limit: PAGE_SIZE,
      skip: p * PAGE_SIZE,
      search: f.search || undefined,
      gender: (f.gender || undefined) as Gender | undefined,
      marital_status: (f.marital_status || undefined) as MaritalStatus | undefined,
      membership_status: (f.membership_status || undefined) as MembershipStatus | undefined,
      verification_status: (f.verification_status || undefined) as VerificationStatus | undefined,
      church_unit_id: f.church_unit_id ? Number(f.church_unit_id) : unitId,
      church_community_id: f.church_community_id ? Number(f.church_community_id) : undefined,
    })
      .then((r: { data?: { items?: ParishionerRow[]; total?: number } }) => {
        setRawItems(r.data?.items ?? []);
        setTotal(r.data?.total ?? 0);
        if (manual) toast.success('Parishioners refreshed');
      })
      .catch((err: unknown) => {
        const msg = extractApiError(err, 'Failed to load parishioners');
        setErrorMsg(msg);
        toastApiError(err, 'Failed to load parishioners');
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client, unitId]);

  useEffect(() => { load(filters, page); }, [filters, page, load]);

  const handleFiltersChange = (f: ParishFilters) => { setFilters(f); setPage(0); setSelectedIds(new Set()); };

  // Client-side post-filters
  let items = [...rawItems];
  if (filters.has_new_church_id === 'yes') items = items.filter(p => !!p.new_church_id);
  if (filters.has_new_church_id === 'no') items = items.filter(p => !p.new_church_id);
  if (filters.date_from) items = items.filter(p => new Date(p.created_at ?? '') >= new Date(filters.date_from));
  if (filters.date_to) items = items.filter(p => new Date(p.created_at ?? '') <= new Date(filters.date_to + 'T23:59:59'));

  if (sortBy) {
    items = [...items].sort((a, b) => {
      const na = displayParishionerName(a), nb = displayParishionerName(b);
      switch (sortBy) {
        case 'name_asc':     return na.localeCompare(nb);
        case 'name_desc':    return nb.localeCompare(na);
        case 'dob_asc':      return (a.date_of_birth ?? '').localeCompare(b.date_of_birth ?? '');
        case 'dob_desc':     return (b.date_of_birth ?? '').localeCompare(a.date_of_birth ?? '');
        case 'created_asc':  return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        case 'created_desc': return (b.created_at ?? '').localeCompare(a.created_at ?? '');
        default: return 0;
      }
    });
  }

  const allOnPageSelected = items.length > 0 && items.every(p => selectedIds.has(p.id));
  const someOnPageSelected = items.some(p => selectedIds.has(p.id));
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageStart = page * PAGE_SIZE + 1;
  const pageEnd = page * PAGE_SIZE + items.length;

  const togglePageSelection = () => {
    if (allOnPageSelected) {
      setSelectedIds(prev => { const next = new Set(prev); items.forEach(p => next.delete(p.id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); items.forEach(p => next.add(p.id)); return next; });
    }
  };

  const toggleRow = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleBulkUpdate = async (type: 'membership_status' | 'verification_status', value: string) => {
    if (!selectedIds.size) return;
    setBulkUpdating(true);
    setMembershipMenuOpen(false);
    setVerifyMenuOpen(false);
    const ids = Array.from(selectedIds);
    let ok = 0; let fail = 0;
    await Promise.all(ids.map(id =>
      (client.updateParishioner as Function)(id, { [type]: value })
        .then(() => { ok++; })
        .catch(() => { fail++; })
    ));
    setBulkUpdating(false);
    if (ok > 0) toast.success(`Updated ${ok} parishioner${ok !== 1 ? 's' : ''}`);
    if (fail > 0) toast.error(`Failed to update ${fail}`);
    if (ok > 0) load(filtersRef.current, page, true);
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const f = filtersRef.current;
      const params = new URLSearchParams();
      if (f.search) params.set('search', f.search);
      if (f.gender) params.set('gender', f.gender);
      if (f.marital_status) params.set('marital_status', f.marital_status);
      if (f.membership_status) params.set('membership_status', f.membership_status);
      if (f.verification_status) params.set('verification_status', f.verification_status);
      if (f.church_unit_id) params.set('church_unit_id', f.church_unit_id);
      else if (unitId) params.set('church_unit_id', String(unitId));
      if (f.church_community_id) params.set('church_community_id', f.church_community_id);
      const base = import.meta.env.VITE_API_URL ?? '';
      const qs = params.toString();
      const url = `${base}/api/v1/parishioners/export-csv${qs ? '?' + qs : ''}`;
      const token = localStorage.getItem(tokenKey);
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `parishioners-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(href);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingCsv(false);
    }
  };

  const accentBtn = `bg-${accentColor} hover:bg-${accentColor}/90`;

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Header ── */}
      <div className="flex-shrink-0 pb-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Parishioners</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total.toLocaleString()} total records
              {items.length < rawItems.length && ` · ${items.length} shown after filter`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load(filtersRef.current, page, true)} disabled={refreshing} title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </Button>
            {extraHeaderButtons}
            {canExport && (
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exportingCsv} title="Export CSV">
                <Download className={`w-3.5 h-3.5 ${exportingCsv ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">{exportingCsv ? 'Exporting…' : 'Export CSV'}</span>
              </Button>
            )}
            {canAdd && addPath && (
              <button
                onClick={() => navigate(addPath)}
                title="Add Parishioner"
                className={`flex items-center gap-1.5 px-3.5 py-2 text-white text-xs font-medium rounded-lg transition-colors ${accentBtn}`}
              >
                <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Parishioner</span>
              </button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
            <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-700">Unable to load parishioners</p>
              <p className="text-xs text-red-500 mt-0.5">{errorMsg}</p>
            </div>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-100 flex-shrink-0"
              onClick={() => load(filtersRef.current, page, true)} disabled={refreshing}>
              Retry
            </Button>
          </div>
        )}

        <FilterPanel
          filters={filters}
          communities={communities}
          onChange={handleFiltersChange}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showUnitFilter={showUnitFilter}
          selectionCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          accent={accentColor}
        />
      </div>

      {/* ── Table: fixed header + scrollable body ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div ref={headRef} className="overflow-hidden flex-shrink-0 border-b border-border bg-muted/95">
          <table className="text-sm border-collapse" style={{ tableLayout: 'fixed', width: COLS.reduce((s, c) => s + c.w, 0) }}>
            <TableColgroup />
            <thead>
              <tr>
                <TH>
                  <input type="checkbox"
                    checked={allOnPageSelected}
                    ref={el => { if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected; }}
                    onChange={togglePageSelection}
                    className="rounded border-border cursor-pointer"
                  />
                </TH>
                <TH>Name</TH><TH>Title</TH><TH>Gender</TH><TH>Date of Birth</TH><TH>Age</TH>
                <TH>Marital Status</TH><TH>Mobile</TH><TH>WhatsApp</TH><TH>Email</TH>
                <TH>Hometown</TH><TH>Region</TH><TH>Country</TH><TH>Residence</TH>
                <TH>Nationality</TH><TH>Place of Birth</TH><TH>Baptismal Name</TH>
                <TH>Maiden Name</TH><TH>Old Church ID</TH><TH>New Church ID</TH>
                <TH>Membership</TH><TH>Verification</TH><TH>Deceased</TH>
                <TH>Created</TH><TH className="text-right">Actions</TH>
              </tr>
            </thead>
          </table>
        </div>

        <div ref={bodyRef} onScroll={onBodyScroll} className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading parishioners…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No parishioners found.</div>
          ) : (
            <table className="text-sm border-collapse" style={{ tableLayout: 'fixed', width: COLS.reduce((s, c) => s + c.w, 0) }}>
              <TableColgroup />
              <tbody className="divide-y divide-border">
                {items.map(p => {
                  const name = displayParishionerName(p);
                  const age = calcAge(p.date_of_birth);
                  const isDeceased = p.is_deceased ?? p.membership_status === 'deceased';
                  return (
                    <tr key={p.id} className={`hover:bg-muted/20 transition-colors ${selectedIds.has(p.id) ? `bg-${accentColor}/5` : ''}`}>
                      <TD>
                        <input type="checkbox" checked={selectedIds.has(p.id)}
                          onChange={() => toggleRow(p.id)}
                          className="rounded border-border cursor-pointer"
                          onClick={e => e.stopPropagation()}
                        />
                      </TD>
                      <TD className="font-medium overflow-hidden">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full bg-${accentColor}/10 border border-${accentColor}/20 flex items-center justify-center flex-shrink-0`}>
                            <span className={`text-${accentColor} text-[11px] font-bold`}>{name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="truncate" title={name}>{name}</span>
                        </div>
                      </TD>
                      <TD className="text-muted-foreground truncate">{p.title ?? '—'}</TD>
                      <TD>
                        {p.gender ? (
                          <Badge color={p.gender === 'male' ? 'bg-blue-50 text-blue-700' : p.gender === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-muted text-muted-foreground'}>
                            {p.gender}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TD>
                      <TD className="text-muted-foreground">{fmtDate(p.date_of_birth)}</TD>
                      <TD className="text-muted-foreground">{age != null ? age : '—'}</TD>
                      <TD className="text-muted-foreground capitalize">{p.marital_status ?? '—'}</TD>
                      <TD className="text-muted-foreground font-mono text-xs truncate">{p.mobile_number ?? '—'}</TD>
                      <TD className="text-muted-foreground font-mono text-xs truncate">{p.whatsapp_number ?? '—'}</TD>
                      <TD className="text-muted-foreground text-xs truncate" title={p.email_address ?? ''}>{p.email_address ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.hometown ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.region ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.country ?? '—'}</TD>
                      <TD className="text-muted-foreground text-xs truncate" title={p.current_residence ?? ''}>{p.current_residence ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.nationality ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.place_of_birth ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.baptismal_name ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.maiden_name ?? '—'}</TD>
                      <TD className="font-mono text-xs text-muted-foreground truncate">{p.old_church_id ?? '—'}</TD>
                      <TD>
                        {p.new_church_id
                          ? <span className="font-mono text-xs text-emerald-700 font-medium truncate block">{p.new_church_id}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TD>
                      <TD><MembershipBadge status={p.membership_status} /></TD>
                      <TD><VerificationBadge status={p.verification_status} /></TD>
                      <TD>
                        {isDeceased
                          ? <Badge color="bg-gray-100 text-gray-600">Yes</Badge>
                          : <span className="text-muted-foreground text-xs">No</span>
                        }
                      </TD>
                      <TD className="text-muted-foreground text-xs">{fmtDate(p.created_at)}</TD>
                      <TD className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/${p.id}`)}>View</Button>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-shrink-0 pt-4 pb-0">
          <p className="text-xs text-muted-foreground">
            Showing {pageStart}–{pageEnd} of {total.toLocaleString()}
            {items.length < rawItems.length && ` (${rawItems.length - items.length} filtered on this page)`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    pg === page ? `bg-${accentColor} text-white` : 'text-muted-foreground hover:bg-muted'
                  }`}>{pg + 1}</button>
              );
            })}
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Floating action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#0f172a] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-white/10">
          <span className="text-sm font-medium whitespace-nowrap">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-white/20" />

          {canMessage && (
            <button onClick={() => setMsgOpen(true)} title="Send Message"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors whitespace-nowrap">
              <MessageSquare className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Send Message</span>
            </button>
          )}

          {canWrite && (
            <>
              <div ref={membershipMenuRef} className="relative">
                <button
                  onClick={() => { setMembershipMenuOpen(o => !o); setVerifyMenuOpen(false); }}
                  disabled={bulkUpdating} title="Membership"
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <ToggleLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Membership</span> <ChevronDown className="w-3 h-3" />
                </button>
                {membershipMenuOpen && (
                  <div className="absolute bottom-full mb-1.5 left-0 w-40 bg-card border border-border rounded-xl shadow-xl py-1 z-50">
                    {['active', 'disabled', 'deceased'].map(s => (
                      <button key={s} onClick={() => handleBulkUpdate('membership_status', s)}
                        className="w-full text-left px-3.5 py-2 text-sm text-foreground hover:bg-muted transition-colors capitalize">{s}</button>
                    ))}
                  </div>
                )}
              </div>

              <div ref={verifyMenuRef} className="relative">
                <button
                  onClick={() => { setVerifyMenuOpen(o => !o); setMembershipMenuOpen(false); }}
                  disabled={bulkUpdating} title="Verification"
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Verification</span> <ChevronDown className="w-3 h-3" />
                </button>
                {verifyMenuOpen && (
                  <div className="absolute bottom-full mb-1.5 left-0 w-40 bg-card border border-border rounded-xl shadow-xl py-1 z-50">
                    {['verified', 'pending', 'unverified'].map(s => (
                      <button key={s} onClick={() => handleBulkUpdate('verification_status', s)}
                        className="w-full text-left px-3.5 py-2 text-sm text-foreground hover:bg-muted transition-colors capitalize">{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="w-px h-4 bg-white/20" />
          <button onClick={() => setSelectedIds(new Set())} className="text-white/50 hover:text-white transition-colors p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {msgOpen && (
        <SendMessageModal parishionerIds={Array.from(selectedIds)} onClose={() => setMsgOpen(false)} />
      )}
    </div>
  );
}
