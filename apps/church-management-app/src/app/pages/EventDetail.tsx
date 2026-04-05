import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../contexts/SDKContext';
import { useAuth } from '../contexts/AuthContext';
import { toastApiError } from '../utils/apiError';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Clock, MapPin, Globe, Lock, Pencil, Save, X, Repeat } from 'lucide-react';
import { Button } from '../components/ui';
import type { ChurchEventRead, ChurchEventUpdate } from '@sfoacc/sdk';

const INPUT = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-olive/30';

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EventDetail() {
  const { unitId, id } = useParams<{ unitId: string; id: string }>();
  const navigate = useNavigate();
  const client = useSDK();
  const { user } = useAuth();
  const [event, setEvent] = useState<ChurchEventRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<ChurchEventRead>>({});

  const isAdmin = !!(user?.role && ['church_administrator', 'ppc_chairman', 'church_secretary'].includes(user.role));

  useEffect(() => {
    if (!unitId || !id) return;
    client.getUnitEvent(Number(unitId), Number(id))
      .then(r => setEvent(r.data as ChurchEventRead))
      .catch(err => {
        toastApiError(err, 'Failed to load event');
        navigate('/events');
      })
      .finally(() => setLoading(false));
  }, [unitId, id, client, navigate]);

  const startEdit = () => { if (event) setDraft({ ...event }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const set = (k: keyof ChurchEventRead, v: unknown) => setDraft(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!unitId || !id || !draft.name || !draft.event_date) { toast.error('Name and date are required'); return; }
    setSaving(true);
    try {
      const payload: ChurchEventUpdate = {
        name: draft.name as string,
        description: (draft.description as string) || null,
        event_date: draft.event_date as string,
        start_time: (draft.start_time as string) || null,
        end_time: (draft.end_time as string) || null,
        location: (draft.location as string) || null,
        is_public: (draft.is_public as boolean) ?? true,
      };
      const res = await client.updateUnitEvent(Number(unitId), Number(id), payload);
      setEvent(res.data as ChurchEventRead);
      setEditing(false);
      toast.success('Event updated');
    } catch (err) { toastApiError(err, 'Failed to save event'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!event || !unitId || !id) return;
    if (!confirm(`Delete "${event.name}"? This cannot be undone.`)) return;
    try {
      await client.deleteUnitEvent(Number(unitId), Number(id));
      toast.success('Event deleted');
      navigate('/events');
    } catch (err) { toastApiError(err, 'Failed to delete event'); }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;
  if (!event) return <div className="p-8 text-sm text-muted-foreground text-center">Event not found.</div>;

  const isPast = event.event_date < new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/events')}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-bold text-foreground truncate">{event.name}</h1>
            {isPast && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium flex-shrink-0">Past</span>}
            {event.is_recurring && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                <Repeat className="w-2.5 h-2.5" /> Recurring
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Church Event</p>
        </div>
        {isAdmin && (
          editing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={cancelEdit} title="Cancel"><X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cancel</span></Button>
              <Button size="sm" isLoading={saving} onClick={save} title="Save"><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={startEdit} title="Edit"><Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span></Button>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDelete}>Delete</Button>
            </div>
          )
        )}
      </div>

      {/* Details card */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Event Name <span className="text-red-500">*</span></label>
              <input value={String(draft.name ?? '')} onChange={e => set('name', e.target.value)} className={INPUT} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Date <span className="text-red-500">*</span></label>
                <input type="date" value={String(draft.event_date ?? '')} onChange={e => set('event_date', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Location</label>
                <input value={String(draft.location ?? '')} onChange={e => set('location', e.target.value)} className={INPUT} placeholder="Church hall…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Start Time</label>
                <input type="time" value={String(draft.start_time ?? '')} onChange={e => set('start_time', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">End Time</label>
                <input type="time" value={String(draft.end_time ?? '')} onChange={e => set('end_time', e.target.value)} className={INPUT} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description</label>
              <textarea value={String(draft.description ?? '')} onChange={e => set('description', e.target.value)}
                rows={3} className={`${INPUT} resize-none`} />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={draft.is_public ?? true} onChange={e => set('is_public', e.target.checked)}
                className="w-4 h-4 rounded border-border accent-olive" />
              <div>
                <p className="text-sm font-medium text-foreground">Public event</p>
                <p className="text-xs text-muted-foreground">Visible to all parishioners</p>
              </div>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Date</p>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="w-4 h-4 text-olive flex-shrink-0" />
                {fmtDate(event.event_date)}
              </div>
            </div>
            {(event.start_time || event.end_time) && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Time</p>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="w-4 h-4 text-olive flex-shrink-0" />
                  {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                </div>
              </div>
            )}
            {event.location && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Location</p>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-olive flex-shrink-0" />
                  {event.location}
                </div>
              </div>
            )}
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Visibility</p>
              {event.is_public ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Globe className="w-3.5 h-3.5" /> Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  <Lock className="w-3.5 h-3.5" /> Private
                </span>
              )}
            </div>
            {event.is_recurring && event.recurrence_frequency && (
              <div className="sm:col-span-2">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Recurrence</p>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Repeat className="w-4 h-4 text-olive flex-shrink-0" />
                  {event.recurrence_frequency.charAt(0).toUpperCase() + event.recurrence_frequency.slice(1)}
                  {event.recurrence_day_of_week != null && ` · ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][event.recurrence_day_of_week]}`}
                  {event.recurrence_end_date && ` · ends ${fmtDate(event.recurrence_end_date)}`}
                </div>
              </div>
            )}
            {event.description && (
              <div className="sm:col-span-2 pt-4 border-t border-border">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
