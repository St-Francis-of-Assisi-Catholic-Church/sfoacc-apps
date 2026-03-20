import { useState, useEffect, useCallback } from 'react';
import { Search, X, ArrowUpDown, LayoutGrid, List, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { ChurchUnitSelect } from './ChurchUnitSelect';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  search: string;
  status: string;
  churchUnit: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  status: '',
  churchUnit: '',
  dateFrom: '',
  dateTo: '',
  sortBy: '',
  sortDir: 'asc',
};

export interface SortOption {
  label: string;
  value: string;
}

export interface StatusOption {
  label: string;
  value: string;
  color?: string; // tailwind text color class e.g. 'text-emerald-600'
  group?: string; // optional group for <optgroup> rendering
}

export type ViewMode = 'table' | 'grid';

interface FilterBarProps {
  onChange: (filters: FilterState) => void;
  statusOptions?: StatusOption[];
  churchUnitOptions?: StatusOption[];
  /** Use the hierarchical ChurchUnitSelect instead of a flat options list */
  hierarchicalChurchUnit?: boolean;
  sortOptions?: SortOption[];
  searchPlaceholder?: string;
  /** Show table/grid view toggle */
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function FilterBar({
  onChange,
  statusOptions,
  churchUnitOptions,
  hierarchicalChurchUnit,
  sortOptions,
  searchPlaceholder = 'Search…',
  viewMode,
  onViewModeChange,
  className = '',
}: FilterBarProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [churchUnit, setChurchUnit] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [dateOpen, setDateOpen] = useState(false);

  // Emit filters — debounce only search changes
  const emit = useCallback((overrides: Partial<FilterState> = {}) => {
    onChange({
      search, status, churchUnit, dateFrom, dateTo, sortBy, sortDir,
      ...overrides,
    });
  }, [search, status, churchUnit, dateFrom, dateTo, sortBy, sortDir, onChange]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => emit({ search }), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Immediate emit for non-search filters
  useEffect(() => { emit(); }, [status, churchUnit, dateFrom, dateTo, sortBy, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters = search || status || churchUnit || dateFrom || dateTo || sortBy;

  const clearAll = () => {
    setSearch(''); setStatus(''); setChurchUnit(''); setDateFrom(''); setDateTo('');
    setSortBy(''); setSortDir('asc');
    onChange(EMPTY_FILTERS);
  };

  const INPUT = 'px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all';
  const SEL = `${INPUT} cursor-pointer pr-8 appearance-none`;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={`${INPUT} w-full pl-9 pr-8`}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        {statusOptions && statusOptions.length > 0 && (
          <div className="relative">
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className={`${SEL} min-w-[120px]`}
            >
              <option value="">All statuses</option>
              {statusOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Church unit filter */}
        {hierarchicalChurchUnit && (
          <div className="relative">
            <ChurchUnitSelect
              value={churchUnit}
              onChange={v => setChurchUnit(v)}
              className={`${SEL} min-w-[160px]`}
            />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        )}
        {!hierarchicalChurchUnit && churchUnitOptions && churchUnitOptions.length > 0 && (() => {
          const hasGroups = churchUnitOptions.some(o => o.group);
          const groups = hasGroups
            ? [...new Set(churchUnitOptions.map(o => o.group ?? ''))]
            : null;
          return (
            <div className="relative">
              <select
                value={churchUnit}
                onChange={e => setChurchUnit(e.target.value)}
                className={`${SEL} min-w-[150px]`}
              >
                <option value="">All church units</option>
                {groups
                  ? groups.map(g => (
                      <optgroup key={g} label={g.charAt(0).toUpperCase() + g.slice(1) + 's'}>
                        {churchUnitOptions.filter(o => o.group === g).map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </optgroup>
                    ))
                  : churchUnitOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))
                }
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          );
        })()}

        {/* Sort */}
        {sortOptions && sortOptions.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className={`${SEL} min-w-[120px]`}
              >
                <option value="">Sort by…</option>
                {sortOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
            {sortBy && (
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                className="p-2 border border-input rounded-lg bg-background hover:bg-muted transition-colors"
              >
                <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}

        {/* Date range toggle */}
        <button
          onClick={() => setDateOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-all ${
            (dateFrom || dateTo || dateOpen)
              ? 'border-navy/30 bg-navy/5 text-navy'
              : 'border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Date range</span>
          {(dateFrom || dateTo) && <span className="w-1.5 h-1.5 rounded-full bg-navy shrink-0" />}
        </button>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted transition-all"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        {viewMode && onViewModeChange && (
          <div className="flex items-center border border-input rounded-lg overflow-hidden bg-background">
            <button
              onClick={() => onViewModeChange('table')}
              title="Table view"
              className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              title="Grid view"
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Date range row (collapsible) */}
      {dateOpen && (
        <div className="flex flex-wrap items-center gap-2 pl-0.5">
          <span className="text-xs text-muted-foreground font-medium w-10">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className={`${INPUT} text-xs`}
          />
          <span className="text-xs text-muted-foreground font-medium">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className={`${INPUT} text-xs`}
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear dates
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers for pages ─────────────────────────────────────────────────────────

/** Client-side filter + sort for any record array */
export function applyFilters<T extends Record<string, unknown>>(
  items: T[],
  filters: FilterState,
  searchFields: (keyof T)[],
  statusField?: keyof T,
  dateField?: keyof T,
): T[] {
  let result = [...items];

  // Search
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(item =>
      searchFields.some(f => String(item[f] ?? '').toLowerCase().includes(q))
    );
  }

  // Status
  if (filters.status && statusField) {
    result = result.filter(item => String(item[statusField] ?? '') === filters.status);
  }

  // Date range
  if ((filters.dateFrom || filters.dateTo) && dateField) {
    result = result.filter(item => {
      const d = new Date(String(item[dateField] ?? ''));
      if (isNaN(d.getTime())) return true;
      if (filters.dateFrom && d < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && d > new Date(filters.dateTo)) return false;
      return true;
    });
  }

  // Sort
  if (filters.sortBy) {
    result.sort((a, b) => {
      const va = String(a[filters.sortBy] ?? '').toLowerCase();
      const vb = String(b[filters.sortBy] ?? '').toLowerCase();
      const cmp = va.localeCompare(vb);
      return filters.sortDir === 'asc' ? cmp : -cmp;
    });
  }

  return result;
}
