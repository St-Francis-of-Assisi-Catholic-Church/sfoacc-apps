import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toastApiError } from '../../utils/apiError';
import { RefreshCw, ChevronRight, BookOpen } from 'lucide-react';
import { Button } from '../../components/ui';

type SacramentType = { id: number; name: string; description?: string | null; once_only?: boolean };

const TYPE_META: Record<string, { icon: string; color: string }> = {
  'Baptism':              { icon: '💧', color: 'text-sky-700   bg-sky-50   border-sky-200'   },
  'First Communion':      { icon: '🍞', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'Confirmation':         { icon: '🕊️', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  'Penance':              { icon: '🙏', color: 'text-green-700 bg-green-50 border-green-200' },
  'Anointing of the Sick':{ icon: '✝️', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  'Holy Orders':          { icon: '⛪', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'Holy Matrimony':       { icon: '💍', color: 'text-rose-700  bg-rose-50  border-rose-200'  },
};

export default function AdminSacraments() {
  const client = useSDK();
  const navigate = useNavigate();
  const [types, setTypes] = useState<SacramentType[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    Promise.all([
      client.listSacraments(),
      client.getParishionerStats(),
    ])
      .then(([typesRes, statsRes]) => {
        setTypes((typesRes.data ?? []) as SacramentType[]);
        if (statsRes.data) {
          setDistribution(statsRes.data.sacraments_distribution ?? {});
          setTotal(statsRes.data.total_parishioners ?? 0);
        }
      })
      .catch(err => toastApiError(err, 'Failed to load sacraments'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Sacraments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total.toLocaleString()} registered parishioners` : 'Sacramental records overview'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-shrink-0">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats grid */}
          {entries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 flex-shrink-0">
              {entries.map(([type, count]) => {
                const meta = TYPE_META[type] ?? { icon: '✝️', color: 'text-muted-foreground bg-muted border-border' };
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={type} className={`border rounded-xl p-5 ${meta.color}`}>
                    <div className="text-2xl mb-2">{meta.icon}</div>
                    <p className="text-2xl font-bold leading-none">{count.toLocaleString()}</p>
                    <p className="text-sm font-medium mt-1 leading-tight">{type}</p>
                    {total > 0 && (
                      <div className="mt-2.5">
                        <div className="h-1 rounded-full bg-current opacity-20 overflow-hidden">
                          <div className="h-full rounded-full bg-current" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs mt-1 opacity-60">{pct}% of parishioners</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Types table */}
          <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-border flex-shrink-0">
              <h2 className="text-sm font-semibold text-foreground">Sacrament Types</h2>
            </div>
            {types.length === 0 ? (
              <div className="p-10 text-center">
                <BookOpen className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No sacrament types found.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sacrament</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Description</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recipients</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Once Only</th>
                      <th className="px-5 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {types.map(t => {
                      const meta = TYPE_META[t.name] ?? { icon: '✝️', color: '' };
                      const count = distribution[t.name] ?? 0;
                      return (
                        <tr key={t.id}
                          className="hover:bg-muted/20 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/admin/sacraments/${t.id}`)}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg">{meta.icon}</span>
                              <span className="font-medium text-foreground">{t.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground hidden sm:table-cell max-w-xs truncate">
                            {t.description || '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-sm font-semibold text-foreground">{count.toLocaleString()}</span>
                            {total > 0 && (
                              <span className="text-xs text-muted-foreground ml-1.5">
                                ({Math.round((count / total) * 100)}%)
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            {t.once_only ? (
                              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">Once only</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Repeatable</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors ml-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
