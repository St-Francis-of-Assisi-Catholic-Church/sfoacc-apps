import { useAuth } from '../contexts/AuthContext';
import { UserCircle, Mail, Phone, Building2, Shield } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your account details</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-navy/80 to-navy-dark px-6 py-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-olive/20 border border-olive/30 flex items-center justify-center flex-shrink-0">
            <span className="text-olive text-2xl font-bold">{initials}</span>
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold">{user.full_name}</h2>
            <p className="text-white/50 text-sm mt-0.5 capitalize">{user.role_label ?? user.role ?? 'Member'}</p>
          </div>
        </div>

        {/* Details */}
        <div className="divide-y divide-border">
          <div className="flex items-center gap-3 px-6 py-4">
            <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>
          </div>

          {user.phone && (
            <div className="flex items-center gap-3 px-6 py-4">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium text-foreground">{user.phone}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 px-6 py-4">
            <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium text-foreground capitalize">{user.role_label ?? user.role ?? '—'}</p>
            </div>
          </div>

          {user.unit_memberships.length > 0 && (
            <div className="flex items-start gap-3 px-6 py-4">
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Church Units</p>
                <div className="flex flex-wrap gap-2">
                  {user.unit_memberships.map(u => (
                    <span key={u.id} className="inline-flex items-center text-xs font-medium bg-olive/10 text-olive-dark border border-olive/20 px-2.5 py-1 rounded-full">
                      {u.name}
                      {u.role_label && <span className="ml-1.5 text-muted-foreground">· {u.role_label}</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 px-6 py-4">
            <UserCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Account Status</p>
              <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
