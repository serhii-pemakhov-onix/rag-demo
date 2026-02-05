import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const isInAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-foreground">
            RAG Demo
          </Link>
          <nav className="underline hover:no-underline">
            {isInAdmin ? (
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Open Chat
              </Link>
            ) : (
              <Link
                to="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Open Admin Panel
              </Link>
            )}
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
