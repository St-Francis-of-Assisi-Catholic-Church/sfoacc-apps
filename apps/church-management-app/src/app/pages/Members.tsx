import { useState, useEffect } from 'react';
import { useParishioners, type ParishionerFilters } from '@sfoacc/sdk';
import { useSDK } from '../contexts/SDKContext';
import { Search, X, RefreshCw, Plus } from 'lucide-react';
import { Button, Badge } from '../components/ui';

export default function Members() {
  const client = useSDK();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const filters: ParishionerFilters = {
    skip: page * limit,
    limit,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading, isError, refetch, isFetching } = useParishioners(client, filters);

  const members = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const statusVariant = (s?: string) => {
    if (s === 'active') return 'success';
    if (s === 'deceased') return 'secondary';
    return 'destructive';
  };

  const verifyVariant = (s?: string) => {
    if (s === 'verified') return 'success';
    if (s === 'pending') return 'warning';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total.toLocaleString()} registered parishioners` : 'Manage parish members'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Member</span>
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          {search && (
            isFetching && debouncedSearch === search ? (
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isError && (
          <div className="text-center py-8 text-red-600 text-sm">
            Failed to load members. Check your API connection.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {['Member', 'Church ID', 'Gender', 'Marital Status', 'Status', 'Verification', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-olive" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-muted-foreground text-sm">Loading members...</span>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map(m => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-olive/10 border border-olive/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-olive">
                            {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {m.first_name} {m.other_names ? `${m.other_names} ` : ''}{m.last_name}
                          </p>
                          {m.mobile_number && <p className="text-xs text-muted-foreground">{m.mobile_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs font-mono">
                      {m.new_church_id ?? m.old_church_id ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground capitalize">{m.gender}</td>
                    <td className="px-6 py-4 text-sm text-foreground capitalize">{m.marital_status ?? '—'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusVariant(m.membership_status)}>{m.membership_status ?? 'unknown'}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={verifyVariant(m.verification_status)}>{m.verification_status ?? 'unverified'}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-olive hover:text-olive-light font-medium">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = totalPages <= 5 ? i
                    : page <= 2 ? i
                    : page >= totalPages - 3 ? totalPages - 5 + i
                    : page - 2 + i;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 border rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum ? 'bg-olive text-white border-olive' : 'border-border hover:bg-muted'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
