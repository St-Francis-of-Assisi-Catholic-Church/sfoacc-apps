import { DollarSign } from 'lucide-react';

export default function Finance() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
        <DollarSign className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Financials Coming Soon</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Financial reporting — dues, collections, and contribution tracking — will be available in a future update.
      </p>
    </div>
  );
}
