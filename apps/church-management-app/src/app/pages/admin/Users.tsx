import { useEffect, useState, useCallback, useRef } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { Plus, RefreshCw, ShieldCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Modal } from '../../components/ui';
import { toastApiError } from '../../utils/apiError';
import type { User } from '@sfoacc/sdk';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'parish_admin', label: 'Parish Admin' },
  { value: 'church_administrator', label: 'Church Administrator' },
  { value: 'church_secretary', label: 'Church Secretary' },
  { value: 'data_entry', label: 'Data Entry' },
];

// plum = #8e3168  cyan-brand = #4cb8d7  gold = golden token
const ROLE_COLORS: Record<string, string> = {
  super_admin:          'bg-[#f5e6f0] text-[#8e3168] border-[#d9a0c4]',
  parish_admin:         'bg-[#e6f7fb] text-[#2d7d96] border-[#9dd8e9]',
  church_administrator: 'bg-[#fef3c7] text-[#9a6c00] border-[#f0d070]',
  church_secretary:     'bg-[#e6f7fb] text-[#1a6e87] border-[#7cc9df]',
  data_entry:           'bg-muted text-muted-foreground border-border',
};

const STATUS_OPTS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'reset_required', label: 'Reset required' },
];

const STATUS_COLORS: Record<string, string> = {
  active:         'bg-emerald-100 text-emerald-800',
  disabled:       'bg-red-100 text-red-700',
  reset_required: 'bg-[#fef3c7] text-[#9a6c00]',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChurchUnitOption {
  id: number;
  name: string;
  type: string;
}

interface UserForm {
  full_name: string;
  email: string;
  phone: string;
  role_name: string;
  church_unit_id: string;
  status: string;
}

const EMPTY_FORM: UserForm = {
  full_name: '',
  email: '',
  phone: '',
  role_name: '',
  church_unit_id: '',
  status: 'active',
};

function formFromUser(u: User): UserForm {
  return {
    full_name: u.full_name ?? '',
    email: u.email ?? '',
    phone: u.phone ?? '',
    role_name: u.role ?? '',
    church_unit_id: u.church_unit_id != null ? String(u.church_unit_id) : '',
    status: u.status ?? 'active',
  };
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition';

// ── User Modal ────────────────────────────────────────────────────────────────

function UserModal({
  open,
  user,
  churchUnits,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: User | null;
  churchUnits: ChurchUnitOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useSDK();
  const isEdit = !!user;
  const [form, setForm] = useState<UserForm>(() => user ? formFromUser(user) : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens with new user
  useEffect(() => {
    if (open) setForm(user ? formFromUser(user) : { ...EMPTY_FORM });
  }, [open, user]);

  const set = (k: keyof UserForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isSuperAdmin = form.role_name === 'super_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (!isEdit && !form.email.trim()) { toast.error('Email is required'); return; }
    if (!form.role_name) { toast.error('Role is required'); return; }
    if (!isSuperAdmin && !form.church_unit_id) { toast.error('Church unit is required for this role'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await client.updateUser(user.id, {
          full_name: form.full_name || null,
          phone: form.phone || null,
          role_name: form.role_name || null,
          church_unit_id: form.church_unit_id ? Number(form.church_unit_id) : null,
          status: (form.status as 'active' | 'disabled' | 'reset_required') || null,
        });
        toast.success('User updated');
      } else {
        await client.createUser({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          role_name: form.role_name || null,
          church_unit_id: form.church_unit_id ? Number(form.church_unit_id) : null,
          status: (form.status as 'active' | 'disabled' | 'reset_required') || undefined,
        });
        toast.success('User created');
      }
      onSaved();
    } catch (err) {
      toastApiError(err, `Failed to ${isEdit ? 'update' : 'create'} user`);
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(churchUnits.map(u => u.type))].sort();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Add User'}
      description={isEdit ? `Editing ${user?.full_name}` : 'A password will be auto-generated and sent to the user.'}
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" form="user-form" isLoading={saving}>
            {isEdit ? 'Save Changes' : 'Add User'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
              placeholder="John Doe" className={inputCls} />
          </Field>

          {!isEdit && (
            <Field label="Email" required>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="user@example.com" className={inputCls} />
            </Field>
          )}

          <Field label="Phone">
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+1 234 567 8900" className={inputCls} />
          </Field>

          <Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="reset_required">Reset Required</option>
            </select>
          </Field>
        </div>

        <Field label="Role" required>
          <select value={form.role_name} onChange={e => set('role_name', e.target.value)} className={inputCls}>
            <option value="">Select role…</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>

        {isSuperAdmin ? (
          <div className="flex items-start gap-2.5 text-xs text-[#8e3168] bg-[#f5e6f0] border border-[#d9a0c4] rounded-lg px-3.5 py-3">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Super Admin has access to all church units — no assignment needed.</span>
          </div>
        ) : (
          <Field label="Church Unit" required>
            <select value={form.church_unit_id} onChange={e => set('church_unit_id', e.target.value)} className={inputCls}>
              <option value="">Select church unit…</option>
              {groups.map(g => (
                <optgroup key={g} label={g.charAt(0).toUpperCase() + g.slice(1) + 's'}>
                  {churchUnits.filter(u => u.type === g).map(u => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        )}
      </form>
    </Modal>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const visible: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) visible.push(i);
    else if (visible[visible.length - 1] !== '…') visible.push('…');
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
      <span>{total} user{total !== 1 ? 's' : ''}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)} disabled={page === 1}
          className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {visible.map((v, i) =>
          v === '…' ? (
            <span key={`e${i}`} className="px-1">…</span>
          ) : (
            <button
              key={v}
              onClick={() => onPage(v as number)}
              className={`w-7 h-7 rounded-md text-xs font-medium transition ${
                v === page ? 'bg-navy text-white' : 'hover:bg-muted'
              }`}
            >
              {v}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)} disabled={page === pages}
          className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const client = useSDK();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [churchUnits, setChurchUnits] = useState<ChurchUnitOption[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [churchUnitFilter, setChurchUnitFilter] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination
  const [page, setPage] = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  // Load church units once
  useEffect(() => {
    client.listChurchUnitsPublic().then(r => {
      const items = Array.isArray(r.data) ? r.data : (r.data as { items?: ChurchUnitOption[] })?.items ?? [];
      setChurchUnits((items as ChurchUnitOption[]).map(u => ({ id: u.id, name: u.name, type: u.type })));
    }).catch(() => {/* non-critical */});
  }, [client]);

  const load = useCallback((opts: { manual?: boolean; resetPage?: boolean } = {}) => {
    if (opts.manual) setRefreshing(true); else setLoading(true);
    const currentPage = opts.resetPage ? 1 : page;
    if (opts.resetPage) setPage(1);

    const params: Record<string, unknown> = {
      limit: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    };
    if (search.trim()) params.search = search.trim();
    if (statusFilter) params.status = statusFilter;
    if (churchUnitFilter) params.church_unit_id = Number(churchUnitFilter);

    client.listUsers(params)
      .then(r => {
        const d = r.data;
        const items: User[] = Array.isArray(d) ? d : (d as { items?: User[] })?.items ?? [];
        setUsers(items);
        setTotal(Array.isArray(d) ? d.length : (d as { total?: number })?.total ?? items.length);
        if (opts.manual) toast.success('Users refreshed');
      })
      .catch(err => toastApiError(err, 'Failed to load users'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client, page, search, statusFilter, churchUnitFilter]);

  // Reload when page changes
  useEffect(() => { load(); }, [load]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setPage(1), 350);
  };

  const openAdd = () => { setEditUser(null); setModalOpen(true); };
  const openEdit = (u: User) => { setEditUser(u); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); load({ manual: true, resetPage: true }); };

  const unitGroups = [...new Set(churchUnits.map(u => u.type))].sort();

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} system user{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load({ manual: true })} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition"
        >
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Church unit */}
        <select
          value={churchUnitFilter}
          onChange={e => { setChurchUnitFilter(e.target.value); setPage(1); }}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition"
        >
          <option value="">All church units</option>
          {unitGroups.map(g => (
            <optgroup key={g} label={g.charAt(0).toUpperCase() + g.slice(1) + 's'}>
              {churchUnits.filter(u => u.type === g).map(u => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Church Unit</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Status</th>
                    <th className="px-5 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(u => {
                    const role = u.role ?? '';
                    const roleColor = ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground border-border';
                    const isSA = role === 'super_admin';
                    return (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                              isSA ? 'bg-[#f5e6f0] border-[#d9a0c4]' : 'bg-[#e6f7fb] border-[#9dd8e9]'
                            }`}>
                              <span className={`text-xs font-bold ${isSA ? 'text-[#8e3168]' : 'text-[#2d7d96]'}`}>
                                {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{u.full_name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{u.email ?? u.phone ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${roleColor}`}>
                            {isSA && <ShieldCheck className="w-3 h-3 shrink-0" />}
                            {role.replace(/_/g, ' ') || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground hidden md:table-cell">
                          {isSA
                            ? <span className="italic text-[#8e3168] font-medium">All units</span>
                            : (u.church_unit_name ?? '—')}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[u.status] ?? 'bg-muted text-muted-foreground'}`}>
                            {u.status?.replace(/_/g, ' ') ?? 'active'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="ghost" size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openEdit(u)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
      </div>

      <UserModal
        open={modalOpen}
        user={editUser}
        churchUnits={churchUnits}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
