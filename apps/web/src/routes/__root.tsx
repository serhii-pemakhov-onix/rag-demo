import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/use-theme';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const location = useLocation();
  const isInAdmin = location.pathname.startsWith('/admin');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="font-bold text-foreground text-xl">
            RAG Demo
          </Link>
          <div className="flex items-center gap-4">
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
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
