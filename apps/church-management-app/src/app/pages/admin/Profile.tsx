import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Mail, Phone, Shield, UserCircle } from 'lucide-react';

export default function AdminProfile() {
  const { user } = useAdminAuth();

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
        <p className="text-muted-foreground text-sm mt-1">Your admin account details</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a2d52] to-[#0f1e3a] px-6 py-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-golden/15 border border-golden/30 flex items-center justify-center flex-shrink-0">
            <span className="text-golden text-2xl font-bold">{initials}</span>
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold">{user.full_name}</h2>
            <p className="text-white/50 text-sm mt-0.5">Super Admin</p>
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
              <p className="text-sm font-medium text-foreground">Super Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-6 py-4">
            <UserCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Account Status</p>
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 bg-green-100 text-green-700">
                {user.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
