import { useState, useEffect, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { toastApiError } from '../../utils/apiError';
import { Search, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-50 text-blue-700',
  POST:   'bg-emerald-50 text-emerald-700',
  PUT:    'bg-amber-50 text-amber-700',
  PATCH:  'bg-amber-50 text-amber-700',
  DELETE: 'bg-red-50 text-red-600',
};

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

type LogEntry = {
  id: number;
  user_id: string | null;
  user_name: string;
  method: string;
  path: string;
  status_code: number;
  ip_address: string | null;
  summary: string;
  created_at: string;
};

export default function AuditLogs() {
  const client = useSDK();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [filterMethod]);

  const load = useCallback(() => {
    setLoading(true);
    client.getAuditLogs({
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      method: filterMethod || undefined,
    })
      .then(r => {
        const d = r.data as { items?: LogEntry[]; total?: number } | LogEntry[] | null;
        if (Array.isArray(d)) { setLogs(d); setTotal(d.length); }
        else { setLogs(d?.items ?? []); setTotal(d?.total ?? 0); }
      })
      .catch(err => toastApiError(err, 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [client, page, debouncedSearch, filterMethod]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const statusColor = (code: number) => {
    if (code < 300) return 'text-emerald-700';
    if (code < 400) return 'text-blue-600';
    if (code < 500) return 'text-amber-600';
    return 'text-red-600';
  };

  const SEL = 'px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none pr-7';

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total.toLocaleString()} entries` : 'System activity log'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 border border-input rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user, path, summary…"
            className="w-full pl-9 pr-8 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Method */}
        <div className="relative">
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className={`${SEL} min-w-[120px]`}>
            <option value="">All methods</option>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs">▾</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10">
              <tr>
                {['Time', 'User', 'Method', 'Path', 'Status', 'Summary', 'IP'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                logs.map(entry => (
                  <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {fmtDateTime(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{entry.user_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded font-mono ${METHOD_COLORS[entry.method] ?? 'bg-muted text-muted-foreground'}`}>
                        {entry.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground max-w-[220px] truncate" title={entry.path}>
                      {entry.path}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold font-mono ${statusColor(entry.status_code)}`}>
                        {entry.status_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate" title={entry.summary}>
                      {entry.summary || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {entry.ip_address || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
