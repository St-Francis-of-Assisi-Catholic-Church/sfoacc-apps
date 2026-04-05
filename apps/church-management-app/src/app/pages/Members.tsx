import { useAuth } from '../contexts/AuthContext';
import { ParishionersTable } from '../components/admin/ParishionersTable';

export default function Members() {
  const { selectedUnit, hasPermission } = useAuth();

  return (
    <ParishionersTable
      basePath="/members"
      addPath="/members/new"
      tokenKey="auth_token"
      unitId={selectedUnit?.id}
      showUnitFilter={false}
      canAdd={hasPermission('parishioner:write')}
      canMessage={hasPermission('messaging:send')}
      canWrite={hasPermission('parishioner:write')}
      canExport={hasPermission('reporting:read')}
      accentColor="olive"
    />
  );
}
