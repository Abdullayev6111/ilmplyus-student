import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

interface PermissionRouteProps {
  permission: string;
}

const PermissionRoute = ({ permission }: PermissionRouteProps) => {
  const permissions = useAuthStore((state) => state.permissions);
  const hasPermission = !permission || permissions.includes(permission);

  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PermissionRoute;
