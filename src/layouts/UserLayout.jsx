import { Outlet } from 'react-router-dom';
import PublicLayout from './PublicLayout';

function UserLayout() {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
}

export default UserLayout;
