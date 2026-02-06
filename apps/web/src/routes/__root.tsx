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
        <div className="mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-bold text-foreground text-xl">
            RAG Demo
          </Link>
          <nav className="underline hover:no-underline">
            {isInAdmin ? (
              <Link
                to="/"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Open Chat
              </Link>
            ) : (
              <Link
                to="/admin"
                className="text-muted-foreground transition-colors hover:text-foreground"
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
