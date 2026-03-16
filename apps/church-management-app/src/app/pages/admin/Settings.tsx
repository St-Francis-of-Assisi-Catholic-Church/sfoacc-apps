import { useEffect, useState, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { Settings, ShieldCheck, Bell, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button } from '../../components/ui';

type Tab = 'app' | 'auth';

export default function AdminSettings() {
  const client = useSDK();
  const [tab, setTab] = useState<Tab>('app');
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setEditing(false);
    const fn = tab === 'app' ? client.getAppSettings() : client.getAuthSettings();
    fn.then(r => setSettings(r.data ?? {}))
      .catch(err => { toastApiError(err, 'Failed to load settings'); setSettings({}); })
      .finally(() => setLoading(false));
  }, [tab, client]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => { setDraft({ ...settings }); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'app') await client.updateAppSettings(draft);
      else await client.updateAuthSettings(draft);
      setSettings(draft);
      setEditing(false);
      toast.success('Settings saved.');
    } catch (err) {
      toastApiError(err, 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const displayed = editing ? draft : settings;

  const TABS = [
    { key: 'app' as Tab,  label: 'App Settings',  icon: Settings },
    { key: 'auth' as Tab, label: 'Auth Settings',  icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">App Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure system-wide settings</p>
        </div>
        {!loading && Object.keys(settings).length > 0 && (
          editing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={cancelEdit}><X className="w-3.5 h-3.5" /> Cancel</Button>
              <Button size="sm" isLoading={saving} onClick={handleSave}><Save className="w-3.5 h-3.5" /> Save</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 max-w-xs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
              tab === key ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        {loading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Loading settings…</div>
        ) : Object.keys(settings).length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No configurable settings available.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(displayed).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                {typeof value === 'boolean' ? (
                  editing ? (
                    <button
                      onClick={() => setDraft(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative w-9 h-5 rounded-full transition-colors ${draft[key] ? 'bg-[#0f172a]' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${draft[key] ? 'translate-x-4' : ''}`} />
                    </button>
                  ) : (
                    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${value ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                      {value ? 'Enabled' : 'Disabled'}
                    </span>
                  )
                ) : (
                  editing ? (
                    <input
                      type="text"
                      value={String(draft[key] ?? '')}
                      onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                      className="px-3 py-1.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring w-48"
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">{String(value ?? '—') || '—'}</span>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
