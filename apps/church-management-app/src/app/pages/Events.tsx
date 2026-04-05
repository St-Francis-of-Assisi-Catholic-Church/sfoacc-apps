import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../contexts/SDKContext';
import { useAuth } from '../contexts/AuthContext';
import { toastApiError } from '../utils/apiError';
import { toast } from 'sonner';
import { Calendar, Clock, MapPin, Globe, Lock, Plus, Pencil, Trash2, Repeat } from 'lucide-react';
import { Button, Modal } from '../components/ui';
import type { ChurchEventRead, ChurchEventCreate } from '@sfoacc/sdk';

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Event Modal ───────────────────────────────────────────────────────────────

interface EventForm {
  name: string; description: string; event_date: string;
  start_time: string; end_time: string; location: string; is_public: boolean;
}
const EMPTY: EventForm = { name: '', description: '', event_date: '', start_time: '', end_time: '', location: '', is_public: true };

function EventModal({ open, event, unitId, onClose, onSaved }: {
  open: boolean; event: ChurchEventRead | null; unitId: number;
  onClose: () => void; onSaved: () => void;
}) {
  const client = useSDK();
  const [form, setForm] = useState<EventForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = !!event;

  useEffect(() => {
    if (open) setForm(event ? {
      name: event.name, description: event.description ?? '',
      event_date: event.event_date, start_time: event.start_time ?? '',
      end_time: event.end_time ?? '', location: event.location ?? '',
      is_public: event.is_public,
    } : EMPTY);
  }, [open, event]);

  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.event_date) { toast.error('Name and date are required'); return; }
    setSaving(true);
    const payload: ChurchEventCreate = {
      name: form.name.trim(), description: form.description || null,
      event_date: form.event_date, start_time: form.start_time || null,
      end_time: form.end_time || null, location: form.location || null,
      is_public: form.is_public,
    };
    try {
      if (isEdit) { await client.updateUnitEvent(unitId, event!.id, payload); toast.success('Event updated'); }
      else { await client.createUnitEvent(unitId, payload); toast.success('Event created'); }
      onSaved();
    } catch (err) { toastApiError(err, isEdit ? 'Failed to update event' : 'Failed to create event'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-olive/30 transition';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Event' : 'New Event'}
      description={isEdit ? 'Update event details' : 'Create a new event for your unit'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" isLoading={saving} onClick={handleSubmit as unknown as React.MouseEventHandler}>
            {isEdit ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Event Name <span className="text-red-500">*</span></label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Parish Feast Day" className={inp} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Church hall…" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Start Time</label>
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">End Time</label>
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inp} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="Optional details…" className={`${inp} resize-none`} />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)}
            className="w-4 h-4 rounded border-border accent-olive" />
          <div>
            <p className="text-sm font-medium text-foreground">Public event</p>
            <p className="text-xs text-muted-foreground">Visible to all parishioners</p>
          </div>
        </label>
      </form>
    </Modal>
  );
}

// ── Event Card ─────────────────────────────────────────────────────────────────

function EventCard({ ev, isAdmin, onEdit, onDelete }: {
  ev: ChurchEventRead; isAdmin: boolean;
  onEdit: (ev: ChurchEventRead) => void; onDelete: (ev: ChurchEventRead) => void;
}) {
  const navigate = useNavigate();
  const isPast = ev.event_date < new Date().toISOString().slice(0, 10);

  return (
    <div
      onClick={() => navigate(`/events/${ev.church_unit_id}/${ev.id}`)}
      className="bg-card border border-border rounded-xl p-5 hover:border-olive/30 hover:shadow-sm transition-all cursor-pointer group relative"
    >
      {/* Admin action buttons */}
      {isAdmin && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit(ev); }}
            className="p-1.5 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground hover:border-olive/30 transition-all"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(ev); }}
            className="p-1.5 rounded-lg bg-background border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 transition-all"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3 pr-14">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={`font-medium text-base truncate ${isPast ? 'text-muted-foreground' : 'text-foreground'}`}>{ev.name}</h3>
          {ev.is_recurring && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <Repeat className="w-2.5 h-2.5" /> Recurring
            </span>
          )}
        </div>
        {ev.is_public ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
            <Globe className="w-2.5 h-2.5" /> Public
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
            <Lock className="w-2.5 h-2.5" /> Private
          </span>
        )}
      </div>
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-olive flex-shrink-0" />
          {fmtDate(ev.event_date)}
          {isPast && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-1">Past</span>}
        </div>
        {ev.start_time && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-olive flex-shrink-0" />
            {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}
          </div>
        )}
        {ev.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-olive flex-shrink-0" />
            <span className="truncate">{ev.location}</span>
          </div>
        )}
      </div>
      {ev.description && (
        <p className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Events() {
  const client = useSDK();
  const { user, selectedUnit } = useAuth();
  const [events, setEvents] = useState<ChurchEventRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<ChurchEventRead | null>(null);

  // Roles that can manage events in the portal
  const isAdmin = !!(user?.role && ['church_administrator', 'ppc_chairman', 'church_secretary'].includes(user.role));
  const unitId = selectedUnit?.id;

  const load = useCallback(() => {
    if (!unitId) { setLoading(false); return; }
    setLoading(true);
    client.listUnitEvents(unitId, { upcoming_only: upcomingOnly })
      .then(r => setEvents(Array.isArray(r.data) ? r.data : []))
      .catch(err => toastApiError(err, 'Failed to load events'))
      .finally(() => setLoading(false));
  }, [client, unitId, upcomingOnly]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (ev: ChurchEventRead) => {
    if (!unitId || !confirm(`Delete "${ev.name}"?`)) return;
    try {
      await client.deleteUnitEvent(unitId, ev.id);
      toast.success('Event deleted');
      load();
    } catch (err) { toastApiError(err, 'Failed to delete event'); }
  };

  const openAdd = () => { setEditEvent(null); setModalOpen(true); };
  const openEdit = (ev: ChurchEventRead) => { setEditEvent(ev); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); load(); };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.event_date >= today);
  const past = events.filter(e => e.event_date < today);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">Liturgical calendar and parish activities</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
            <input type="checkbox" checked={upcomingOnly} onChange={e => setUpcomingOnly(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-olive" />
            Upcoming only
          </label>
          {isAdmin && unitId && (
            <Button size="sm" onClick={openAdd} title="Add Event">
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Event</span>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : !unitId ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No church unit selected.</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No events found.</p>
          {isAdmin && (
            <button onClick={openAdd}
              className="mt-3 text-sm text-olive hover:underline">
              Add the first event
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcoming.map(ev => (
                  <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
          {!upcomingOnly && past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {past.map(ev => (
                  <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {unitId && (
        <EventModal
          open={modalOpen}
          event={editEvent}
          unitId={unitId}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
