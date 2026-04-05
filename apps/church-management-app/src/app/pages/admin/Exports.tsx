import { useState } from 'react';
import { Download, Database, Users, FileText, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui';
import { toast } from 'sonner';

type ExportState = 'idle' | 'loading' | 'done' | 'error';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function ExportCard({
  icon: Icon,
  title,
  description,
  endpoint,
  filename,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  endpoint: string;
  filename: string;
  accent: string;
}) {
  const [state, setState] = useState<ExportState>('idle');

  const handleDownload = async () => {
    setState('loading');
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Export failed' }));
        throw new Error(err.detail ?? 'Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState('done');
      toast.success(`${title} downloaded successfully`);
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      setState('error');
      toastApiError(err, `Failed to export ${title}`);
      setTimeout(() => setState('idle'), 4000);
    }
  };

  return (
    <div className={`bg-card border border-border rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      {state === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Export failed. Check your connection and try again.
        </div>
      )}

      <Button
        size="sm"
        variant={state === 'done' ? 'outline' : 'default'}
        isLoading={state === 'loading'}
        onClick={handleDownload}
        className="self-start"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{state === 'done' ? 'Downloaded' : state === 'loading' ? 'Exporting…' : 'Download'}</span>
      </Button>
    </div>
  );
}

export default function Exports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-foreground">Exports & Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Download system data for backup, reporting, or migration.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ExportCard
          icon={Database}
          title="Database Dump"
          description="Full PostgreSQL backup in custom format (.dump). Restorable with pg_restore. Includes all tables, records, and relationships."
          endpoint="/api/v1/admin/export/db-dump"
          filename={`sfoacc_dump_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.dump`}
          accent="bg-navy/10 text-navy"
        />
        <ExportCard
          icon={Users}
          title="Users CSV"
          description="All users with ID, name, email, phone, status, login method, global role, church units, and timestamps. Church units include role assignments."
          endpoint="/api/v1/admin/export/users-csv"
          filename={`users_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`}
          accent="bg-olive/10 text-olive"
        />
        <ExportCard
          icon={FileText}
          title="Parishioners CSV"
          description="Full parishioner registry with membership details, sacrament records, contact information, and church unit assignments."
          endpoint="/api/v1/admin/export/parishioners-csv"
          filename={`parishioners_export_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`}
          accent="bg-emerald-100 text-emerald-700"
        />
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Export Notes</p>
            <p>Database dumps contain all system data and should be stored securely. Only super administrators can access these exports.</p>
            <p>CSV exports are generated in real-time and reflect the current state of the database.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
