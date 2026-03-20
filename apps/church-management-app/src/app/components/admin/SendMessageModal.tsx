import { useState, FormEvent } from 'react';
import { X, Send, Mail, MessageSquare, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui';
import { useSDK } from '../../contexts/SDKContext';
import { toastApiError } from '../../utils/apiError';

// ── Templates ─────────────────────────────────────────────────────────────────

export const MESSAGE_TEMPLATES: { id: string; label: string; subject: string; body: string }[] = [
  {
    id: 'custom',
    label: 'Custom Message',
    subject: '',
    body: '',
  },
  {
    id: 'welcome',
    label: 'Welcome to the Parish',
    subject: 'Welcome to Saints Francis of Assisi Catholic Church',
    body: 'Dear {name},\n\nWelcome to Saints Francis of Assisi Catholic Church! We are truly delighted to have you as a member of our parish family. May your journey with us be filled with grace and community.\n\nGod bless you.',
  },
  {
    id: 'verification_reminder',
    label: 'Verification Reminder',
    subject: 'Complete Your Membership Verification',
    body: 'Dear {name},\n\nThis is a friendly reminder to complete your membership verification. Please update your profile so that we can keep our parish records accurate.\n\nThank you.',
  },
  {
    id: 'dues_reminder',
    label: 'Church Dues Reminder',
    subject: 'Church Dues Reminder',
    body: 'Dear {name},\n\nThis is a gentle reminder that your church dues are outstanding. Kindly settle your dues at your earliest convenience.\n\nThank you for your continued support of our parish.',
  },
  {
    id: 'event_invite',
    label: 'Event Invitation',
    subject: 'You Are Invited to a Parish Event',
    body: 'Dear {name},\n\nWe would like to invite you to an upcoming event at our parish. Details will be communicated shortly. We hope to see you there!\n\nGod bless.',
  },
  {
    id: 'bereavement',
    label: 'Bereavement / Condolence',
    subject: 'Our Condolences',
    body: 'Dear {name},\n\nThe entire parish family extends our heartfelt condolences to you and your loved ones during this difficult time. You are in our thoughts and prayers.',
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Channel = 'email' | 'sms' | 'both';

interface Props {
  parishionerIds: string[];
  defaultChannel?: Channel;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SendMessageModal({ parishionerIds, defaultChannel = 'both', onClose }: Props) {
  const client = useSDK();

  const [templateId, setTemplateId] = useState('custom');
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = MESSAGE_TEMPLATES.find(t => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setMessage(tpl.body);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { toast.error('Message cannot be empty.'); return; }
    setSending(true);
    try {
      await client.sendBulkMessage({
        parishioner_ids: parishionerIds,
        channel,
        custom_message: message.trim(),
        subject: subject.trim() || null,
        template: templateId !== 'custom' ? templateId : undefined,
      });
      toast.success('Message sent successfully.');
      onClose();
    } catch (err) {
      toastApiError(err, 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const showSubject = channel === 'email' || channel === 'both';

  const CHANNELS: { id: Channel; label: string; icon: React.ElementType }[] = [
    { id: 'both',  label: 'Email & SMS', icon: Users },
    { id: 'email', label: 'Email only',  icon: Mail },
    { id: 'sms',   label: 'SMS only',    icon: MessageSquare },
  ];

  const INP = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">Send Message</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {parishionerIds.length === 1 ? '1 recipient' : `${parishionerIds.length} recipients`}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="flex flex-col flex-1 min-h-0 overflow-y-auto p-5 space-y-4">

          {/* Channel */}
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Channel</label>
            <div className="flex gap-2">
              {CHANNELS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    channel === id
                      ? 'bg-navy text-white border-navy'
                      : 'bg-background border-border text-muted-foreground hover:border-navy/40 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Template */}
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Template</label>
            <select
              value={templateId}
              onChange={e => selectTemplate(e.target.value)}
              className={`${INP} appearance-none cursor-pointer`}
            >
              {MESSAGE_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          {showSubject && (
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Subject <span className="text-muted-foreground/50 normal-case font-normal">(email)</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className={INP}
                placeholder="Email subject…"
              />
            </div>
          )}

          {/* Message */}
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Message <span className="text-destructive">*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              className={`${INP} resize-none`}
              placeholder="Type your message… Use {name} to personalise."
              required
            />
            <p className="text-[10px] text-muted-foreground mt-1">Use <code className="bg-muted px-1 rounded">{'{name}'}</code> to insert the recipient's name.</p>
          </div>

        </form>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-end gap-2 flex-shrink-0 border-t border-border pt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button size="sm" isLoading={sending} onClick={handleSend} disabled={!message.trim()}>
            <Send className="w-3 h-3" /> Send Message
          </Button>
        </div>

      </div>
    </div>
  );
}
