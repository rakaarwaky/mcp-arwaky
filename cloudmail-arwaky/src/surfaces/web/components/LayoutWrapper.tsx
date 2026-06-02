import { Outlet } from 'react-router';
import ProtectedRoute from './ProtectedRoute';

export default function LayoutWrapper() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}
