import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { BookMarked, Plus, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button } from '../../components/ui';
import { FilterBar, applyFilters, EMPTY_FILTERS } from '../../components/admin/FilterBar';
import type { FilterState, ViewMode } from '../../components/admin/FilterBar';

type Society = { id: number; name: string; description?: string; [key: string]: unknown };

const SORT_OPTIONS = [
  { label: 'Name', value: 'name' },
  { label: 'Members', value: 'member_count' },
  { label: 'Date Inaugurated', value: 'date_inaugurated' },
];

export default function AdminSocieties() {
  const client = useSDK();
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<Society[]>([]);
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
    client.listSocieties({ limit: 100, search: '', church_unit_id: churchUnitId || undefined })
      .then(r => {
        setAllItems(r.data?.items ?? []);
        if (manual) toast.success('Societies refreshed');
      })
      .catch(err => toastApiError(err, 'Failed to load'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client]);

  useEffect(() => {
    load(filters.churchUnit ? Number(filters.churchUnit) : undefined);
  }, [load, filters.churchUnit]);

  // Client-side filter + sort
  const items = applyFilters(allItems, filters, ['name', 'description', 'church_unit_name'], undefined, 'date_inaugurated');

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Societies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length}{allItems.length !== items.length ? ` of ${allItems.length}` : ''} societies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(filters.churchUnit ? Number(filters.churchUnit) : undefined, true)} disabled={refreshing} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </Button>
          <Button size="sm" title="Add Society"><Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Society</span></Button>
        </div>
      </div>

      <FilterBar
        onChange={setFilters}
        sortOptions={SORT_OPTIONS}
        churchUnitOptions={churchUnitOptions}
        searchPlaceholder="Search societies…"
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
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground animate-pulse">Loading societies…</div>
        )
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No societies match your filters.</p>
        </div>
      ) : viewMode === 'grid' ? (

        // ── Grid view ──
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-navy/20 transition-all group flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#fef3c7] border border-[#f0d070] flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-4 h-4 text-[#9a6c00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{s.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {(s as Record<string, unknown>).church_unit_name as string ?? 'Parish'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>{(s as Record<string, unknown>).member_count as number ?? 0} members</span>
                {s.date_inaugurated && (
                  <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    Est. {new Date(String(s.date_inaugurated)).getFullYear()}
                  </span>
                )}
              </div>
              {s.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{s.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1 justify-center text-xs" onClick={() => navigate(`/admin/societies/${s.id}`)}>
                  <Users className="w-3 h-3" /> Members
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/societies/${s.id}`)}>View</Button>
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Society</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Church Unit</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Members</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Description</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(s => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                        <BookMarked className="w-4 h-4 text-indigo-700" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{s.name}</p>
                        {s.date_inaugurated && (
                          <p className="text-[10px] text-muted-foreground">Est. {new Date(String(s.date_inaugurated)).getFullYear()}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs hidden sm:table-cell">
                    {(s as Record<string, unknown>).church_unit_name as string ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      {(s as Record<string, unknown>).member_count as number ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs hidden lg:table-cell max-w-xs truncate">
                    {s.description ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/societies/${s.id}`)}>View</Button>
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
