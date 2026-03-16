import { Plus, TrendingUp, Banknote, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui';

const COLLECTIONS = [
  { id: 1, type: '1st Collection', date: '2026-03-09', amount: 320000, method: 'Cash + Transfer', collector: 'Deacon Paul' },
  { id: 2, type: '2nd Collection', date: '2026-03-09', amount: 180000, method: 'Cash', collector: 'Mr. Emeka Eze' },
  { id: 3, type: 'Development Levy', date: '2026-03-07', amount: 650000, method: 'Bank Transfer', collector: 'Finance Committee' },
  { id: 4, type: '1st Collection', date: '2026-03-02', amount: 295000, method: 'Cash + Transfer', collector: 'Deacon Paul' },
  { id: 5, type: 'Special Thanksgiving', date: '2026-02-28', amount: 1200000, method: 'Mixed', collector: 'Finance Committee' },
];

const fmt = (n: number) => `₦ ${n.toLocaleString('en-NG')}`;
const totalThisMonth = COLLECTIONS.filter(c => c.date.startsWith('2026-03')).reduce((s, c) => s + c.amount, 0);

function StatValue({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function Finance() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">Collections, tithes, and parish accounts</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Record Collection</span>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Hero card */}
        <div className="bg-gradient-to-br from-olive to-golden-light rounded-xl p-5 text-primary-foreground relative overflow-hidden">
          <div className="absolute -right-3 -top-3 opacity-10">
            <Banknote className="w-24 h-24" strokeWidth={1} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">March Collections</p>
          </div>
          <p className="text-3xl font-display font-bold">
            <StatValue>{fmt(totalThisMonth)}</StatValue>
          </p>
          <p className="text-primary-foreground/70 text-xs mt-1">+8% vs February</p>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border hover:border-golden/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-golden/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-golden" />
            </div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">YTD Total</p>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">₦ 7.2M</p>
          <p className="text-muted-foreground text-xs mt-1">Jan – Mar 2026</p>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border hover:border-border transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Pending Audit</p>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">2 records</p>
          <p className="text-muted-foreground text-xs mt-1">Needs verification</p>
        </div>
      </div>

      {/* Collections table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-base text-foreground">Collection Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {['Type', 'Date', 'Amount', 'Method', 'Collector', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COLLECTIONS.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground text-sm">{c.type}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 font-semibold text-olive text-sm">{fmt(c.amount)}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{c.method}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{c.collector}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sm text-olive hover:text-olive-light font-medium">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
