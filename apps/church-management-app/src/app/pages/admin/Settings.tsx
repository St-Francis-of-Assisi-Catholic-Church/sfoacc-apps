import { useEffect, useState, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { Settings, ShieldCheck, Bell, Pencil, Save, X, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button } from '../../components/ui';
import { useTheme, THEMES, type ThemeId } from '../../contexts/ThemeContext';

type Tab = 'app' | 'auth' | 'appearance';

export default function AdminSettings() {
  const client = useSDK();
  const { themeId, setTheme } = useTheme();
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
    { key: 'app' as Tab,        label: 'App Settings',  icon: Settings },
    { key: 'auth' as Tab,       label: 'Auth Settings', icon: ShieldCheck },
    { key: 'appearance' as Tab, label: 'Appearance',    icon: Palette },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">App Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure system-wide settings</p>
        </div>
        {tab !== 'appearance' && !loading && Object.keys(settings).length > 0 && (
          editing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={cancelEdit} title="Cancel"><X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cancel</span></Button>
              <Button size="sm" isLoading={saving} onClick={handleSave} title="Save"><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit} title="Edit"><Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span></Button>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 max-w-sm">
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

      {tab === 'appearance' ? (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground">Accent Theme</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choose a colour palette for the application</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {THEMES.map(t => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as ThemeId)}
                  className={`flex flex-col items-center gap-2.5 p-3 rounded-xl border-2 transition-all ${
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent hover:border-border hover:bg-muted/50'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full shadow-sm border border-black/10"
                    style={{ backgroundColor: t.swatch }}
                  />
                  <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {t.name}
                  </span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
