import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute('/admin/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.name || 'Admin'}!</CardTitle>
          <CardDescription>You are logged in as {user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Use the sidebar to manage articles and images in your knowledge base.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
