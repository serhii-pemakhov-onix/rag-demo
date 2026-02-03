import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from '@tanstack/react-router';
import { getStoredAuth } from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ location }) => {
    // Skip auth check for login page
    if (location.pathname === '/admin/login') {
      return;
    }
    const { accessToken } = getStoredAuth();
    if (!accessToken) {
      throw redirect({ to: '/admin/login' });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user, logout, isLoggingOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Render just the outlet for login page (no sidebar)
  if (location.pathname === '/admin/login') {
    return <Outlet />;
  }

  const navItems = [
    { to: '/admin', label: 'Dashboard', exact: true },
    { to: '/admin/articles', label: 'Articles' },
    { to: '/admin/images', label: 'Images' },
  ];

  return (
    <div className="flex h-[calc(100vh-73px)]">
      <aside className="w-64 border-r bg-muted/30 p-4">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Logged in as</p>
          <p className="font-medium truncate">{user?.email}</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'block px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 pt-6 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                await logout();
              } finally {
                navigate({ to: '/admin/login' });
              }
            }}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
