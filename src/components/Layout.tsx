import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
