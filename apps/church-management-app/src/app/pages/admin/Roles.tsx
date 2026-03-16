import { useEffect, useState, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { ShieldCheck, RefreshCw, Pencil, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button, Modal } from '../../components/ui';
import type { RoleRead, PermissionRead } from '@sfoacc/sdk';

// ── Permission Modal ──────────────────────────────────────────────────────────

function PermissionsModal({
  open, role, allPermissions, onClose, onSaved,
}: {
  open: boolean;
  role: RoleRead | null;
  allPermissions: PermissionRead[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useSDK();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && role) {
      setSelected(new Set(role.permissions.map(p => p.id)));
    }
  }, [open, role]);

  const toggle = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleModule = (ids: number[]) => {
    setSelected(prev => {
      const s = new Set(prev);
      const allOn = ids.every(id => s.has(id));
      ids.forEach(id => allOn ? s.delete(id) : s.add(id));
      return s;
    });
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await client.setRolePermissions(role.id, { permission_ids: [...selected] });
      toast.success('Permissions updated');
      onSaved();
    } catch (err) {
      toastApiError(err, 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by module
  const modules = allPermissions.reduce<Record<string, PermissionRead[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={`Permissions — ${role?.label ?? ''}`}
      description={`${selected.size} permission${selected.size !== 1 ? 's' : ''} selected`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" isLoading={saving} onClick={handleSave}>Save Permissions</Button>
        </div>
      }
    >
      {role?.is_system && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          This is a system role. Permissions can be adjusted but the role itself cannot be deleted.
        </div>
      )}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {Object.entries(modules).sort(([a], [b]) => a.localeCompare(b)).map(([module, perms]) => {
          const moduleIds = perms.map(p => p.id);
          const allOn = moduleIds.every(id => selected.has(id));
          const someOn = moduleIds.some(id => selected.has(id));
          return (
            <div key={module} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleModule(moduleIds)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              >
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{module}</span>
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  allOn ? 'bg-navy border-navy' : someOn ? 'bg-navy/30 border-navy/50' : 'border-border bg-background'
                }`}>
                  {(allOn || someOn) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              </button>
              <div className="divide-y divide-border">
                {perms.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="w-3.5 h-3.5 rounded border-border accent-navy shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{p.name}</p>
                      {p.description && <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>}
                    </div>
                    <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{p.code}</code>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminRoles() {
  const client = useSDK();
  const [roles, setRoles] = useState<RoleRead[]>([]);
  const [permissions, setPermissions] = useState<PermissionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleRead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback((manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    Promise.allSettled([client.listRoles(), client.listPermissions()])
      .then(([r, p]) => {
        if (r.status === 'fulfilled') setRoles(Array.isArray(r.value.data) ? r.value.data : []);
        if (p.status === 'fulfilled') setPermissions(Array.isArray(p.value.data) ? p.value.data : []);
        if (manual) toast.success('Roles refreshed');
      })
      .catch(err => { if (manual) toastApiError(err, 'Failed to refresh'); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const openPermissions = (role: RoleRead) => {
    setSelectedRole(role);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    load(true);
  };

  // Grouped: system roles first, then custom
  const systemRoles = roles.filter(r => r.is_system);
  const customRoles = roles.filter(r => !r.is_system);

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{roles.length} role{roles.length !== 1 ? 's' : ''} · {permissions.length} permissions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading roles…</div>
        ) : (
          <>
            {/* System Roles */}
            {systemRoles.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">System Roles</h2>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Description</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Permissions</th>
                        <th className="px-5 py-3 w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {systemRoles.map(role => (
                        <RoleRow key={role.id} role={role} onEdit={openPermissions} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Custom Roles */}
            {customRoles.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Custom Roles</h2>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Description</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Permissions</th>
                        <th className="px-5 py-3 w-24" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {customRoles.map(role => (
                        <RoleRow key={role.id} role={role} onEdit={openPermissions} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {roles.length === 0 && (
              <div className="p-12 text-center bg-card border border-border rounded-xl">
                <ShieldCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No roles found.</p>
              </div>
            )}
          </>
        )}
      </div>

      <PermissionsModal
        open={modalOpen}
        role={selectedRole}
        allPermissions={permissions}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}

// ── Role Row ──────────────────────────────────────────────────────────────────

function RoleRow({ role, onEdit }: { role: RoleRead; onEdit: (r: RoleRead) => void }) {
  // Group permissions by module for compact display
  const modules = [...new Set(role.permissions.map(p => p.module))].sort();
  return (
    <tr className="hover:bg-muted/20 transition-colors group">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${role.is_system ? 'bg-[#f5e6f0] border border-[#d9a0c4]' : 'bg-[#e6f7fb] border border-[#9dd8e9]'}`}>
            <ShieldCheck className={`w-3.5 h-3.5 ${role.is_system ? 'text-[#8e3168]' : 'text-[#2d7d96]'}`} />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">{role.label}</p>
            <p className="text-[10px] font-mono text-muted-foreground">{role.name}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-xs text-muted-foreground hidden md:table-cell max-w-xs truncate">
        {role.description ?? '—'}
      </td>
      <td className="px-5 py-3.5 hidden sm:table-cell">
        <div className="flex flex-wrap gap-1">
          {modules.length === 0 ? (
            <span className="text-xs text-muted-foreground/50">No permissions</span>
          ) : modules.slice(0, 4).map(m => (
            <span key={m} className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded font-medium">{m}</span>
          ))}
          {modules.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">+{modules.length - 4}</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}</p>
      </td>
      <td className="px-5 py-3.5 text-right">
        <Button variant="ghost" size="sm" onClick={() => onEdit(role)}
          className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5">
          <Pencil className="w-3 h-3" /> Permissions
        </Button>
      </td>
    </tr>
  );
}
