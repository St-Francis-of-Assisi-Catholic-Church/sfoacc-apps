import { useNavigate, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface NavItemProps {
  path: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export function NavItem({ path, label, icon: Icon, exact = false }: NavItemProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const active = exact
    ? location.pathname === path
    : location.pathname.startsWith(path);

  return (
    <button
      onClick={() => navigate(path)}
      className={`px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2 whitespace-nowrap ${
        active
          ? 'bg-olive text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
