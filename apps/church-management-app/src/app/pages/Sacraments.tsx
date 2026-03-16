import { Plus } from 'lucide-react';
import { Button, Badge } from '../components/ui';
import type { BadgeProps } from '../components/ui';

const SACRAMENTS = [
  { id: 1, type: 'Baptism', recipient: 'Baby Emmanuel Chukwu', date: '2026-03-22', minister: 'Fr. Anthony Eze', status: 'scheduled' },
  { id: 2, type: 'Confirmation', recipient: 'Miss Ada Nwosu', date: '2026-04-12', minister: 'Bishop Michael Obi', status: 'scheduled' },
  { id: 3, type: 'Marriage', recipient: 'Mr. Emeka & Miss Chioma Adeyemi', date: '2026-04-18', minister: 'Fr. Anthony Eze', status: 'scheduled' },
  { id: 4, type: 'Baptism', recipient: 'Baby Grace Okafor', date: '2026-03-01', minister: 'Fr. Peter Nwankwo', status: 'completed' },
  { id: 5, type: 'Holy Orders', recipient: 'Deacon James Uche', date: '2026-02-15', minister: 'Archbishop Samuel', status: 'completed' },
  { id: 6, type: 'Anointing of the Sick', recipient: 'Mr. Felix Ogbu', date: '2026-03-10', minister: 'Fr. Anthony Eze', status: 'completed' },
];

const typeIcons: Record<string, string> = {
  Baptism: '💧',
  Confirmation: '🕊️',
  Marriage: '💍',
  'Holy Orders': '✝️',
  'Anointing of the Sick': '🙏',
  'First Communion': '🍞',
};

const typeVariant: Record<string, BadgeProps['variant']> = {
  Baptism: 'outline',
  Confirmation: 'default',
  Marriage: 'warning',
  'Holy Orders': 'secondary',
  'Anointing of the Sick': 'success',
};

export default function Sacraments() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Sacraments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage sacramental records</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Record Sacrament</span>
        </Button>
      </div>

      {/* Summary icons */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(typeIcons).map(([type, icon]) => (
          <div key={type} className="bg-card border border-border rounded-xl p-3 text-center hover:border-olive/30 transition-colors">
            <span className="text-2xl">{icon}</span>
            <p className="text-xs font-medium text-muted-foreground mt-1 leading-tight">{type}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-base text-foreground">Recent Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {['Sacrament', 'Recipient', 'Date', 'Minister', 'Status', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SACRAMENTS.map(s => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span>{typeIcons[s.type] ?? '✝️'}</span>
                      <Badge variant={typeVariant[s.type] ?? 'default'}>{s.type}</Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground text-sm">{s.recipient}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{s.minister}</td>
                  <td className="px-6 py-4">
                    <Badge variant={s.status === 'completed' ? 'success' : 'warning'}>{s.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sm text-olive hover:text-olive-light font-medium">View</button>
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
