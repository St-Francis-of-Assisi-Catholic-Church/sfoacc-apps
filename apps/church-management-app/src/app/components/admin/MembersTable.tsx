import { useState, useMemo, useEffect } from 'react';
import { Search, X, UserPlus, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type GroupMember = {
  id: string;
  // Full-name variants the API may return
  name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  other_names?: string | null;
  last_name?: string | null;
  // Contact
  email?: string | null;
  email_address?: string | null;
  mobile?: string | null;
  mobile_number?: string | null;
  // Membership
  role?: string | null;
  date_joined?: string | null;
  join_date?: string | null;
  status?: string | null;
  gender?: string | null;
  membership_status?: string | null;
  // Church ID
  church_id?: string | null;
  [key: string]: unknown;
};

function getMemberName(m: GroupMember): string {
  if (m.name) return m.name;
  if (m.full_name) return m.full_name;
  return [m.first_name, m.other_names, m.last_name].filter(Boolean).join(' ') || '—';
}

function getMemberEmail(m: GroupMember): string | null {
  return m.email_address ?? m.email ?? m.mobile ?? m.mobile_number ?? null;
}

function getJoinDate(m: GroupMember): string | null | undefined {
  return m.date_joined ?? m.join_date;
}

interface Props {
  members: GroupMember[];
  avatarClass?: string;
  navigateTo?: (m: GroupMember) => string;
  onAddMember?: () => void;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 20;

export function MembersTable({ members, avatarClass = 'bg-violet-50 border-violet-100 text-violet-600', navigateTo, onAddMember }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [search, filterGender, filterStatus, sortBy]);

  const filtered = useMemo(() => {
    let list = members;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => getMemberName(m).toLowerCase().includes(q));
    }
    if (filterGender) list = list.filter(m => m.gender === filterGender);
    if (filterStatus) list = list.filter(m => (m.status ?? m.membership_status) === filterStatus);

    if (sortBy) {
      list = [...list].sort((a, b) => {
        switch (sortBy) {
          case 'name_asc':    return getMemberName(a).localeCompare(getMemberName(b));
          case 'name_desc':   return getMemberName(b).localeCompare(getMemberName(a));
          case 'joined_asc':  return (getJoinDate(a) ?? '').localeCompare(getJoinDate(b) ?? '');
          case 'joined_desc': return (getJoinDate(b) ?? '').localeCompare(getJoinDate(a) ?? '');
          case 'status_asc':  return (a.membership_status ?? a.status ?? '').localeCompare(b.membership_status ?? b.status ?? '');
          default: return 0;
        }
      });
    }

    return list;
  }, [members, search, filterGender, filterStatus, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const SEL = 'px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer appearance-none pr-6';

  return (
    <div className="flex flex-col min-h-0 h-full">

      {/* ── Filters (fixed) ── */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-muted/10 flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full pl-8 pr-7 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Gender */}
        <div className="relative">
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className={SEL}>
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Status */}
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={SEL}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="deceased">Deceased</option>
            <option value="disabled">Disabled</option>
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={SEL}>
            <option value="">Sort: Default</option>
            <option value="name_asc">Name A → Z</option>
            <option value="name_desc">Name Z → A</option>
            <option value="joined_asc">Joined ↑</option>
            <option value="joined_desc">Joined ↓</option>
            <option value="status_asc">Status</option>
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        <span className="text-xs text-muted-foreground">{filtered.length}/{members.length}</span>

        {onAddMember && (
          <button onClick={onAddMember}
            className="flex items-center gap-1.5 ml-auto text-xs font-medium px-3 py-1.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors">
            <UserPlus className="w-3.5 h-3.5" />
            Add Member
          </button>
        )}
      </div>

      {/* ── Table rows (scrollable) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search || filterGender || filterStatus ? 'No members match the current filters.' : 'No members found.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Role</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Joined</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Status</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Gender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map(m => {
                const memberStatus = (m.status ?? m.membership_status) as string | null | undefined;
                return (
                  <tr key={m.id}
                    className={`hover:bg-muted/20 transition-colors ${navigateTo ? 'cursor-pointer' : ''}`}
                    onClick={() => navigateTo && navigate(navigateTo(m))}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${avatarClass}`}>
                          <span className="text-xs font-bold">{getMemberName(m).charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{getMemberName(m)}</p>
                          {getMemberEmail(m) && <p className="text-[11px] text-muted-foreground truncate">{getMemberEmail(m)}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">{m.role?.replace(/_/g, ' ') || '—'}</span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{fmtDate(getJoinDate(m))}</span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {memberStatus ? (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                          memberStatus === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          memberStatus === 'deceased' ? 'bg-gray-100 text-gray-600' :
                          'bg-muted text-muted-foreground'
                        }`}>{memberStatus}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {m.gender ? (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                          m.gender === 'male' ? 'bg-blue-50 text-blue-700' :
                          m.gender === 'female' ? 'bg-pink-50 text-pink-700' :
                          'bg-muted text-muted-foreground'
                        }`}>{m.gender}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination (fixed) ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10 flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-2.5 py-1 border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = totalPages <= 5 ? i
                : page <= 2 ? i
                : page >= totalPages - 3 ? totalPages - 5 + i
                : page - 2 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2.5 py-1 border rounded-lg text-xs font-medium transition-colors ${
                    page === p ? 'bg-navy text-white border-navy' : 'border-border hover:bg-muted'
                  }`}>
                  {p + 1}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-2.5 py-1 border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
