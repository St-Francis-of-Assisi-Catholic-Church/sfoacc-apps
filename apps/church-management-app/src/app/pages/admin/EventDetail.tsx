import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import {
  ArrowLeft, Pencil, Save, X, Info, Send,
  Calendar, Clock, MapPin, Globe, Lock, Repeat, MessageSquare, Plus,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { SendMessageModal } from '../../components/admin/SendMessageModal';
import type { ChurchEventRead, ChurchEventUpdate, EventMessageRead, EventMessageCreate } from '@sfoacc/sdk';

type Tab = 'details' | 'messages' | 'notifications';

const INPUT = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  reminder: 'Reminder',
  announcement: 'Announcement',
  note: 'Note',
};

const MESSAGE_TYPE_COLORS: Record<string, string> = {
  reminder: 'text-amber-700 bg-amber-50 border-amber-200',
  announcement: 'text-blue-700 bg-blue-50 border-blue-200',
  note: 'text-violet-700 bg-violet-50 border-violet-200',
};

// ── New Message Form ──────────────────────────────────────────────────────────

function NewMessagePanel({ eventId, onSaved }: { eventId: number; onSaved: () => void }) {
  const client = useSDK();
  const [form, setForm] = useState<EventMessageCreate>({
    message_type: 'reminder', title: '', content: '', scheduled_at: null,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EventMessageCreate>(k: K, v: EventMessageCreate[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return; }
    setSaving(true);
    try {
      await client.addEventMessage(eventId, {
        ...form,
        scheduled_at: form.scheduled_at || null,
      });
      toast.success('Message added');
      setForm({ message_type: 'reminder', title: '', content: '', scheduled_at: null });
      onSaved();
    } catch (err) {
      toastApiError(err, 'Failed to add message');
    } finally {
      setSaving(false);
    }
  };

  const inp = `${INPUT} mt-1`;

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add Message
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-foreground">Type</label>
          <select value={form.message_type}
            onChange={e => set('message_type', e.target.value as EventMessageCreate['message_type'])}
            className={inp}>
            <option value="reminder">Reminder</option>
            <option value="announcement">Announcement</option>
            <option value="note">Note</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Scheduled At (optional)</label>
          <input type="datetime-local" value={form.scheduled_at ?? ''}
            onChange={e => set('scheduled_at', e.target.value || null)}
            className={inp} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-foreground">Title <span className="text-red-500">*</span></label>
        <input value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Don't forget Sunday Mass" className={inp} />
      </div>
      <div>
        <label className="text-xs font-medium text-foreground">Content <span className="text-red-500">*</span></label>
        <textarea value={form.content} onChange={e => set('content', e.target.value)}
          rows={3} placeholder="Message body…" className={`${inp} resize-none`} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" isLoading={saving} type="submit">
          <Plus className="w-3.5 h-3.5" /> Add Message
        </Button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventDetail() {
  const { unitId, id } = useParams<{ unitId: string; id: string }>();
  const navigate = useNavigate();
  const client = useSDK();

  const [event, setEvent] = useState<ChurchEventRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [tab, setTab] = useState<Tab>('details');
  const [draft, setDraft] = useState<Partial<ChurchEventRead>>({});
  const [msgOpen, setMsgOpen] = useState(false);
  const [parishionerIds, setParishionerIds] = useState<string[]>([]);
  const [loadingIds, setLoadingIds] = useState(false);
  const [messages, setMessages] = useState<EventMessageRead[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!unitId || !id) return;
    client.getUnitEvent(Number(unitId), Number(id))
      .then(r => { setEvent(r.data as ChurchEventRead); })
      .catch(err => {
        toastApiError(err, 'Failed to load event');
        navigate('/admin/events');
      })
      .finally(() => setLoading(false));
  }, [unitId, id, client]);

  const loadMessages = () => {
    if (!id) return;
    setLoadingMessages(true);
    client.listEventMessages(Number(id))
      .then(r => setMessages(Array.isArray(r.data) ? r.data : []))
      .catch(err => toastApiError(err, 'Failed to load messages'))
      .finally(() => setLoadingMessages(false));
  };

  const openMessagesTab = () => {
    setTab('messages');
    if (messages.length === 0) loadMessages();
  };

  const startEdit = () => { if (event) setDraft({ ...event }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const set = (k: keyof ChurchEventRead, v: unknown) => setDraft(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!unitId || !id || !draft.name || !draft.event_date) {
      toast.error('Name and date are required');
      return;
    }
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
    } catch (err) {
      toastApiError(err, 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !unitId || !id) return;
    if (!confirm(`Delete "${event.name}"? This cannot be undone.`)) return;
    try {
      await client.deleteUnitEvent(Number(unitId), Number(id));
      toast.success('Event deleted');
      navigate('/admin/events');
    } catch (err) {
      toastApiError(err, 'Failed to delete event');
    }
  };

  const handleTerminate = async () => {
    if (!event || !id) return;
    if (!confirm(`Terminate the recurring series for "${event.name}"? No future occurrences will be generated.`)) return;
    setTerminating(true);
    try {
      const res = await client.terminateEvent(Number(id));
      setEvent(res.data as ChurchEventRead);
      toast.success('Recurring series terminated');
    } catch (err) {
      toastApiError(err, 'Failed to terminate series');
    } finally {
      setTerminating(false);
    }
  };

  const openNotifications = async () => {
    setTab('notifications');
    if (parishionerIds.length > 0) return;
    setLoadingIds(true);
    try {
      const r = await client.listParishioners({ limit: 500 });
      const items = Array.isArray(r.data) ? r.data : (r.data as { items?: { id: string }[] })?.items ?? [];
      setParishionerIds((items as { id: string }[]).map(p => p.id));
    } catch (err) {
      toastApiError(err, 'Failed to load parishioners');
    } finally {
      setLoadingIds(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;
  if (!event) return <div className="p-8 text-sm text-muted-foreground text-center">Event not found.</div>;

  const isPast = event.event_date < new Date().toISOString().slice(0, 10);

  const TABS: { id: Tab; label: string; icon: React.ElementType; onClick?: () => void }[] = [
    { id: 'details', label: 'Details', icon: Info },
    { id: 'messages', label: 'Messages', icon: MessageSquare, onClick: openMessagesTab },
    { id: 'notifications', label: 'Notifications', icon: Send, onClick: openNotifications },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex-shrink-0 pb-0">
        <div className="flex items-center gap-3 pb-4">
          <button onClick={() => navigate('/admin/events')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-bold text-foreground truncate">{event.name}</h1>
              {isPast && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium flex-shrink-0">Past</span>
              )}
              {event.is_recurring && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Repeat className="w-2.5 h-2.5" /> Recurring
                </span>
              )}
              {event.is_active === false && (
                <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Terminated</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Event · {fmtDate(event.event_date)}
              {event.start_time && ` · ${event.start_time}${event.end_time ? ` – ${event.end_time}` : ''}`}
            </p>
          </div>
          {tab === 'details' && (
            editing ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={cancelEdit} title="Cancel"><X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cancel</span></Button>
                <Button size="sm" isLoading={saving} onClick={save} title="Save"><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {event.is_recurring && event.is_active !== false && (
                  <Button variant="outline" size="sm" isLoading={terminating}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={handleTerminate} title="Terminate Series">
                    <Repeat className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Terminate Series</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={startEdit} title="Edit"><Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span></Button>
                <Button variant="outline" size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            )
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => t.onClick ? t.onClick() : setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        {/* ── Details ── */}
        {tab === 'details' && (
          <div className="space-y-5 max-w-2xl py-5">
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-semibold text-foreground">Event Details</h2>

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
                      <input value={String(draft.location ?? '')} onChange={e => set('location', e.target.value)} className={INPUT} placeholder="Church hall, main grounds…" />
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
                      className="w-4 h-4 rounded border-border accent-navy" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Public event</p>
                      <p className="text-xs text-muted-foreground">Visible to all parishioners</p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Date</p>
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {fmtDate(event.event_date)}
                      </div>
                    </div>
                    {(event.start_time || event.end_time) && (
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Time</p>
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                        </div>
                      </div>
                    )}
                    {event.location && (
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Location</p>
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {event.location}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Visibility</p>
                      {event.is_public ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}
                    </div>
                    {event.is_recurring && event.recurrence_frequency && (
                      <div className="sm:col-span-2">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Recurrence</p>
                        <div className="flex items-center gap-1.5 text-sm text-foreground">
                          <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                          {event.recurrence_frequency.charAt(0).toUpperCase() + event.recurrence_frequency.slice(1)}
                          {event.recurrence_day_of_week != null && ` · ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][event.recurrence_day_of_week]}`}
                          {event.recurrence_end_date && ` · ends ${fmtDate(event.recurrence_end_date)}`}
                        </div>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        {tab === 'messages' && (
          <div className="space-y-5 max-w-2xl py-5">
            <NewMessagePanel eventId={Number(id)} onSaved={loadMessages} />

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Message History</h2>
              </div>
              {loadingMessages ? (
                <div className="p-6 text-center text-sm text-muted-foreground animate-pulse">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {messages.map(m => (
                    <div key={m.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${MESSAGE_TYPE_COLORS[m.message_type] ?? 'text-muted-foreground bg-muted border-border'}`}>
                            {MESSAGE_TYPE_LABELS[m.message_type] ?? m.message_type}
                          </span>
                          <p className="text-sm font-medium text-foreground">{m.title}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground whitespace-nowrap">{fmtDateTime(m.created_at)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.content}</p>
                      {m.scheduled_at && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Scheduled: {fmtDateTime(m.scheduled_at)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {tab === 'notifications' && (
          <div className="space-y-5 max-w-2xl py-5">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Send Event Notification</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Notify parishioners about this event via email or SMS.
                  Use <code className="bg-muted px-1 rounded">{'{event_name}'}</code>,{' '}
                  <code className="bg-muted px-1 rounded">{'{event_date}'}</code>,{' '}
                  <code className="bg-muted px-1 rounded">{'{event_time}'}</code>,{' '}
                  <code className="bg-muted px-1 rounded">{'{event_location}'}</code> in your message.
                </p>
              </div>

              <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">Event Summary</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Name: </span><span className="text-foreground font-medium">{event.name}</span></div>
                  <div><span className="text-muted-foreground">Date: </span><span className="text-foreground font-medium">{fmtDate(event.event_date)}</span></div>
                  {event.start_time && <div><span className="text-muted-foreground">Time: </span><span className="text-foreground font-medium">{event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}</span></div>}
                  {event.location && <div><span className="text-muted-foreground">Location: </span><span className="text-foreground font-medium">{event.location}</span></div>}
                </div>
              </div>

              {loadingIds ? (
                <p className="text-xs text-muted-foreground animate-pulse">Loading parishioner list…</p>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {parishionerIds.length > 0
                      ? `${parishionerIds.length} parishioner${parishionerIds.length !== 1 ? 's' : ''} will receive this notification`
                      : 'No parishioners loaded'}
                  </p>
                  <Button size="sm" onClick={() => setMsgOpen(true)} disabled={parishionerIds.length === 0}>
                    <Send className="w-3.5 h-3.5" /> Compose & Send
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {msgOpen && (
        <SendMessageModal
          parishionerIds={parishionerIds}
          defaultChannel="both"
          onClose={() => setMsgOpen(false)}
        />
      )}
    </div>
  );
}
