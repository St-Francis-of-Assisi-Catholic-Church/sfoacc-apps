import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { Users2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';
import { toastApiError } from '../../utils/apiError';
import { toast } from 'sonner';
import { FilterBar, applyFilters, EMPTY_FILTERS } from '../../components/admin/FilterBar';
import type { FilterState, ViewMode } from '../../components/admin/FilterBar';

type ChurchCommunity = { id: number; name: string; description?: string; [key: string]: unknown };

const SORT_OPTIONS = [
  { label: 'Name', value: 'name' },
  { label: 'Church Unit', value: 'church_unit_name' },
  { label: 'Members', value: 'member_count' },
];

export default function AdminCommunities() {
  const client = useSDK();
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<ChurchCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [churchUnitOptions, setChurchUnitOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    client.listChurchUnitsPublic()
      .then(r => setChurchUnitOptions((r.data ?? []).map(u => ({ label: u.name, value: String(u.id), group: u.type }))))
      .catch(() => {});
  }, [client]);

  const load = useCallback((churchUnitId?: number, manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    client.listCommunities({ limit: 100, church_unit_id: churchUnitId || undefined })
      .then(r => {
        setAllItems(r.data?.items ?? []);
        if (manual) toast.success('Communities refreshed');
      })
      .catch(err => toastApiError(err, 'Failed to load'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client]);

  useEffect(() => {
    load(filters.churchUnit ? Number(filters.churchUnit) : undefined);
  }, [load, filters.churchUnit]);

  const items = applyFilters(allItems, filters, ['name', 'description', 'church_unit_name'], undefined, 'created_at');

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Church Communities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length}{allItems.length !== items.length ? ` of ${allItems.length}` : ''} communities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(filters.churchUnit ? Number(filters.churchUnit) : undefined, true)} disabled={refreshing} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </Button>
          <Button size="sm" title="Add Community"><Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Community</span></Button>
        </div>
      </div>

      <FilterBar
        onChange={setFilters}
        sortOptions={SORT_OPTIONS}
        churchUnitOptions={churchUnitOptions}
        searchPlaceholder="Search communities…"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground animate-pulse">Loading communities…</div>
        )
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Users2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No communities match your filters.</p>
        </div>
      ) : viewMode === 'grid' ? (

        // ── Grid view ──
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-[#4cb8d7]/30 transition-all group flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#e6f7fb] border border-[#9dd8e9] flex items-center justify-center flex-shrink-0">
                  <Users2 className="w-4 h-4 text-[#2d7d96]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{c.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {(c as Record<string, unknown>).church_unit_name as string ?? 'Parish'}
                  </p>
                </div>
              </div>
              {(c as Record<string, unknown>).member_count !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Users2 className="w-3.5 h-3.5" />
                  <span>{(c as Record<string, unknown>).member_count as number ?? 0} members</span>
                </div>
              )}
              {c.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{c.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1 justify-center text-xs" onClick={() => navigate(`/admin/communities/${c.id}`)}>
                  <Users2 className="w-3 h-3" /> Members
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/communities/${c.id}`)}>View</Button>
              </div>
            </div>
          ))}
        </div>

      ) : (

        // ── Table view ──
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Community</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Church Unit</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Members</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Description</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(c => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Users2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs hidden sm:table-cell">
                    {(c as Record<string, unknown>).church_unit_name as string ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users2 className="w-3 h-3" />
                      {(c as Record<string, unknown>).member_count as number ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs hidden lg:table-cell max-w-xs truncate">
                    {c.description ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/communities/${c.id}`)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
