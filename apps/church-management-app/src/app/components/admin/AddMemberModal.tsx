import { useState, useEffect, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { X, Search, UserPlus, Check } from 'lucide-react';
import { Button } from '../ui';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import type { Parishioner } from '@sfoacc/sdk';

interface Props {
  groupId: number;
  groupType: 'community' | 'society';
  existingMemberIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}

function fullName(p: Parishioner) {
  return [p.first_name, p.other_names, p.last_name].filter(Boolean).join(' ') || '—';
}

export function AddMemberModal({ groupId, groupType, existingMemberIds, onClose, onAdded }: Props) {
  const client = useSDK();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Parishioner[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const doSearch = useCallback((q: string) => {
    setLoading(true);
    client.listParishioners({ limit: 30, search: q || undefined })
      .then(r => setResults(r.data?.items ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [client]);

  // Initial load + debounced search
  useEffect(() => {
    const t = setTimeout(() => doSearch(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  const toggle = (id: string) => {
    if (existingMemberIds.has(id)) return; // already a member
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const members = Array.from(selected).map(id => ({ parishioner_id: id }));
      if (groupType === 'society') {
        await client.addSocietyMembers(groupId, members);
      } else {
        await client.addCommunityMembers(groupId, members);
      }
      toast.success(`Added ${selected.size} member${selected.size !== 1 ? 's' : ''}`);
      onAdded();
      onClose();
    } catch (err) {
      toastApiError(err, 'Failed to add members');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add Members</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Search parishioners to add to this {groupType}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, email…"
              className="w-full pl-8 pr-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Results list */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin h-4 w-4 border-2 border-navy border-t-transparent rounded-full" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {search ? 'No parishioners found.' : 'Start typing to search parishioners…'}
            </div>
          ) : (
            results.map(p => {
              const already = existingMemberIds.has(p.id);
              const checked = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  disabled={already}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    already ? 'opacity-50 cursor-default bg-muted/20' :
                    checked ? 'bg-navy/5 hover:bg-navy/10' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    already ? 'bg-muted border-border' :
                    checked ? 'bg-navy border-navy' : 'border-border'
                  }`}>
                    {(already || checked) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{fullName(p)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.email_address ?? p.mobile_number ?? ''}
                      {already && <span className="ml-1 text-[10px] font-medium text-emerald-600">· already a member</span>}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : 'Select parishioners to add'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} isLoading={saving} disabled={selected.size === 0}>
              <UserPlus className="w-3.5 h-3.5" />
              Add {selected.size > 0 ? selected.size : ''} Member{selected.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
