import { Plus, Calendar, Clock, Users } from 'lucide-react';
import { Button, Badge } from '../components/ui';
import type { BadgeProps } from '../components/ui';

const EVENTS = [
  { id: 1, name: 'Sunday Mass (1st)', date: '2026-03-16', time: '8:00 AM', category: 'Mass', attendees: 320 },
  { id: 2, name: 'Sunday Mass (2nd)', date: '2026-03-16', time: '10:30 AM', category: 'Mass', attendees: 280 },
  { id: 3, name: 'Stations of the Cross', date: '2026-03-20', time: '6:00 PM', category: 'Devotion', attendees: 85 },
  { id: 4, name: 'Choir Rehearsal', date: '2026-03-22', time: '4:00 PM', category: 'Ministry', attendees: 24 },
  { id: 5, name: 'Palm Sunday Mass', date: '2026-03-23', time: '8:00 AM', category: 'Mass', attendees: 400 },
  { id: 6, name: 'Confessions', date: '2026-03-26', time: '5:00 PM', category: 'Sacrament', attendees: 60 },
  { id: 7, name: 'Holy Thursday Mass', date: '2026-04-02', time: '7:00 PM', category: 'Mass', attendees: 350 },
  { id: 8, name: 'Good Friday Service', date: '2026-04-03', time: '3:00 PM', category: 'Liturgy', attendees: 420 },
  { id: 9, name: 'Easter Vigil', date: '2026-04-04', time: '8:00 PM', category: 'Mass', attendees: 500 },
];

const categoryVariant: Record<string, BadgeProps['variant']> = {
  Mass: 'default',
  Devotion: 'secondary',
  Ministry: 'success',
  Sacrament: 'warning',
  Liturgy: 'outline',
};

export default function Events() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">Liturgical calendar and parish activities</p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Event</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {EVENTS.map(event => (
          <div key={event.id} className="bg-card border border-border rounded-xl p-5 hover:border-olive/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-medium text-foreground text-base">{event.name}</h3>
              <Badge variant={categoryVariant[event.category] ?? 'default'} className="flex-shrink-0">
                {event.category}
              </Badge>
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-olive flex-shrink-0" />
                {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-olive flex-shrink-0" />
                {event.time}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-olive flex-shrink-0" />
                ~{event.attendees} expected
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 justify-center">Edit</Button>
              <Button size="sm" className="flex-1 justify-center">Attendance</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
