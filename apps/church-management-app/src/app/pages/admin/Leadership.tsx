import { useEffect, useState, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { UserCog, Plus, RefreshCw, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button, Modal, PhoneInput } from '../../components/ui';
import type { LeadershipRead, LeadershipCreate, LeadershipRole } from '@sfoacc/sdk';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEADERSHIP_ROLES: { value: LeadershipRole; label: string }[] = [
  { value: 'priest_in_charge',   label: 'Priest in Charge' },
  { value: 'assistant_priest',   label: 'Assistant Priest' },
  { value: 'deacon',             label: 'Deacon' },
  { value: 'church_administrator', label: 'Church Administrator' },
  { value: 'church_secretary',   label: 'Church Secretary' },
  { value: 'ppc_chairman',       label: 'PPC Chairman' },
  { value: 'ppc_vice_chairman',  label: 'PPC Vice Chairman' },
  { value: 'ppc_secretary',      label: 'PPC Secretary' },
  { value: 'ppc_treasurer',      label: 'PPC Treasurer' },
  { value: 'ppc_member',         label: 'PPC Member' },
  { value: 'other',              label: 'Other' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChurchUnitOption { id: number; name: string; type: string }

interface LeadershipForm {
  role: LeadershipRole | '';
  custom_role: string;
  name: string;
  phone: string;
  email: string;
  is_current: boolean;
  start_date: string;
  end_date: string;
  notes: string;
}

const EMPTY_FORM: LeadershipForm = {
  role: '', custom_role: '', name: '', phone: '', email: '',
  is_current: true, start_date: '', end_date: '', notes: '',
};

// ── Leadership Modal ──────────────────────────────────────────────────────────

function LeadershipModal({
  open, leader, selectedUnit, onClose, onSaved,
}: {
  open: boolean;
  leader: LeadershipRead | null;
  selectedUnit: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useSDK();
  const [form, setForm] = useState<LeadershipForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = !!leader;

  useEffect(() => {
    if (open) {
      setForm(leader ? {
        role: leader.role,
        custom_role: leader.custom_role ?? '',
        name: leader.name,
        phone: leader.phone ?? '',
        email: leader.email ?? '',
        is_current: leader.is_current,
        start_date: leader.start_date ?? '',
        end_date: leader.end_date ?? '',
        notes: leader.notes ?? '',
      } : EMPTY_FORM);
    }
  }, [open, leader]);

  const set = (k: keyof LeadershipForm, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role || !form.name.trim()) { toast.error('Role and name are required'); return; }
    setSaving(true);
    const payload: LeadershipCreate = {
      role: form.role as LeadershipRole,
      custom_role: form.custom_role || null,
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      is_current: form.is_current,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes || null,
    };
    try {
      if (isEdit) {
        if (selectedUnit) await client.updateUnitLeadership(Number(selectedUnit), leader!.id, payload);
        else await client.updateParishLeadership(leader!.id, payload);
        toast.success('Leader updated');
      } else {
        if (selectedUnit) await client.createUnitLeadership(Number(selectedUnit), payload);
        else await client.createParishLeadership(payload);
        toast.success('Leader added');
      }
      onSaved();
    } catch (err) {
      toastApiError(err, isEdit ? 'Failed to update' : 'Failed to add leader');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition';

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'Edit Leader' : 'Add Leader'}
      description={isEdit ? 'Update leadership details' : 'Add a new church leader'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" isLoading={saving} onClick={handleSubmit as unknown as React.MouseEventHandler}>
            {isEdit ? 'Save Changes' : 'Add Leader'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Role <span className="text-red-500">*</span></label>
            <select value={form.role} onChange={e => set('role', e.target.value as LeadershipRole)} className={inputCls}>
              <option value="">Select role…</option>
              {LEADERSHIP_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {form.role === 'other' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Custom Role</label>
              <input value={form.custom_role} onChange={e => set('custom_role', e.target.value)}
                placeholder="e.g. Youth Coordinator" className={inputCls} />
            </div>
          )}
          <div className={form.role === 'other' ? '' : 'sm:col-span-2'}>
            <label className="block text-xs font-medium text-foreground mb-1">Full Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Rev. Fr. John Doe" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Phone</label>
            <PhoneInput value={form.phone} onChange={v => set('phone', v)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="leader@church.org" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Start Date</label>
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">End Date</label>
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={2} placeholder="Optional notes…"
            className={`${inputCls} resize-none`} />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={form.is_current} onChange={e => set('is_current', e.target.checked)}
            className="w-4 h-4 rounded border-border accent-navy" />
          <div>
            <p className="text-sm font-medium text-foreground">Currently serving</p>
            <p className="text-xs text-muted-foreground">Mark as current leadership member</p>
          </div>
        </label>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminLeadership() {
  const client = useSDK();
  const [leaders, setLeaders] = useState<LeadershipRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [churchUnits, setChurchUnits] = useState<ChurchUnitOption[]>([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [currentOnly, setCurrentOnly] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLeader, setEditLeader] = useState<LeadershipRead | null>(null);

  useEffect(() => {
    client.listChurchUnitsPublic()
      .then(r => { setChurchUnits((Array.isArray(r.data) ? r.data : []) as ChurchUnitOption[]); })
      .catch(() => {});
  }, [client]);

  const load = useCallback((manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    const req = selectedUnit
      ? client.listUnitLeadership(Number(selectedUnit), currentOnly)
      : client.listParishLeadership(currentOnly);
    req
      .then(r => {
        setLeaders(Array.isArray(r.data) ? r.data : []);
        if (manual) toast.success('Leadership refreshed');
      })
      .catch(err => toastApiError(err, 'Failed to load'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client, selectedUnit, currentOnly]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (l: LeadershipRead) => {
    if (!confirm(`Remove "${l.name}" from leadership?`)) return;
    try {
      if (selectedUnit) await client.deleteUnitLeadership(Number(selectedUnit), l.id);
      else await client.deleteParishLeadership(l.id);
      toast.success('Leader removed');
      load();
    } catch (err) { toastApiError(err, 'Failed to remove leader'); }
  };

  const openAdd = () => { setEditLeader(null); setModalOpen(true); };
  const openEdit = (l: LeadershipRead) => { setEditLeader(l); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); load(true); };

  const unitGroups = [...new Set(churchUnits.map(u => u.type))].sort();

  const getRoleLabel = (role: LeadershipRole, custom?: string | null) => {
    if (role === 'other' && custom) return custom;
    return LEADERSHIP_ROLES.find(r => r.value === role)?.label ?? role.replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Parish Leadership</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{leaders.length} leader{leaders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </Button>
          <Button size="sm" onClick={openAdd} title="Add Leader">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Leader</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        <select
          value={selectedUnit}
          onChange={e => setSelectedUnit(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition"
        >
          <option value="">Parish (primary)</option>
          {unitGroups.map(g => (
            <optgroup key={g} label={g.charAt(0).toUpperCase() + g.slice(1) + 's'}>
              {churchUnits.filter(u => u.type === g).map(u => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
          <input type="checkbox" checked={currentOnly} onChange={e => setCurrentOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-navy" />
          Current leaders only
        </label>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading leadership…</div>
          ) : leaders.length === 0 ? (
            <div className="p-12 text-center">
              <UserCog className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No leadership records found.</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leader</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Period</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaders.map(l => (
                  <tr key={l.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#f5e6f0] border border-[#d9a0c4] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#8e3168]">{l.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{l.name}</p>
                          {l.notes && <p className="text-[11px] text-muted-foreground truncate max-w-xs">{l.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f5e6f0] text-[#8e3168] border border-[#d9a0c4]">
                        {getRoleLabel(l.role, l.custom_role)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {l.phone && <p>{l.phone}</p>}
                        {l.email && <p>{l.email}</p>}
                        {!l.phone && !l.email && <span className="text-muted-foreground/40">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-muted-foreground">
                      {l.start_date ? (
                        <span>{new Date(l.start_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                          {l.end_date ? ` – ${new Date(l.end_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ' – present'}
                        </span>
                      ) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {l.is_current ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Current
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Former
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(l)} title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(l)} title="Remove"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
      </div>

      <LeadershipModal
        open={modalOpen}
        leader={editLeader}
        selectedUnit={selectedUnit}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
