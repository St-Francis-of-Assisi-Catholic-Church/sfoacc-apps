import { useEffect, useState } from 'react';
import { useSDK } from '../contexts/SDKContext';
import { useAuth } from '../contexts/AuthContext';
import { toastApiError } from '../utils/apiError';
import { BookOpen } from 'lucide-react';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  'Baptism':              { icon: '💧', color: 'text-sky-700   bg-sky-50   border-sky-200'   },
  'First Communion':      { icon: '🍞', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'Confirmation':         { icon: '🕊️', color: 'text-violet-700 bg-violet-50 border-violet-200' },
  'Penance':              { icon: '🙏', color: 'text-green-700 bg-green-50 border-green-200' },
  'Anointing of the Sick':{ icon: '✝️', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  'Holy Orders':          { icon: '⛪', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'Holy Matrimony':       { icon: '💍', color: 'text-rose-700  bg-rose-50  border-rose-200'  },
};

export default function Sacraments() {
  const client = useSDK();
  const { selectedUnit } = useAuth();
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = selectedUnit?.id ? { church_unit_id: selectedUnit.id } : {};
    client.getParishionerStats(params)
      .then(r => {
        if (r.data) {
          setDistribution(r.data.sacraments_distribution ?? {});
          setTotal(r.data.total_parishioners ?? 0);
        }
      })
      .catch(err => toastApiError(err, 'Failed to load sacrament stats'))
      .finally(() => setLoading(false));
  }, [client, selectedUnit?.id]);

  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Sacraments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sacramental records{selectedUnit ? ` · ${selectedUnit.name}` : ''}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No sacrament data available.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

          {total > 0 && (
            <p className="text-xs text-muted-foreground">
              Based on {total.toLocaleString()} registered parishioner{total !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}
