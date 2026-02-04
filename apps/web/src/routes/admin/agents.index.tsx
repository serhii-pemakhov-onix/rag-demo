import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddAgentDialog } from '@/components/admin/AddAgentDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { useAgentsPaginated, useDeleteAgent, useUpdateAgent } from '@/hooks/useAgents';

export const Route = createFileRoute('/admin/agents/')({
  component: AgentsIndexPage,
});

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function AgentsIndexPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data: rawData, isLoading, error } = useAgentsPaginated(page, limit);
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();

  // Handle both paginated response and raw array (backward compat)
  const agents = rawData ? (Array.isArray(rawData) ? rawData : rawData.data) : [];
  const meta = rawData && !Array.isArray(rawData) ? rawData.meta : null;

  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await updateMutation.mutateAsync({
      id,
      data: { isActive: !currentActive },
    });
  };

  const handleDeleteClick = (id: string) => {
    setAgentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return;
    await deleteMutation.mutateAsync(agentToDelete);
    setDeleteDialogOpen(false);
    setAgentToDelete(null);
  };

  const handleAgentCreated = () => {
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Button onClick={() => setAddAgentOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent List</CardTitle>
          <CardDescription>Manage your agents</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading...</p>}
          {error && <p className="text-destructive">Failed to load agents</p>}
          {!isLoading && !error && agents.length === 0 && (
            <p className="text-muted-foreground">No agents yet. Create one above.</p>
          )}
          {agents.length > 0 && (
            <>
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Slug</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">
                        Description
                      </th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id} className="border-b last:border-b-0">
                        <td className="p-3 font-medium">{agent.name}</td>
                        <td className="p-3 text-muted-foreground">{agent.slug}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                          {agent.description || '-'}
                        </td>
                        <td className="p-3">
                          <StatusBadge isActive={agent.isActive} />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(agent.id, agent.isActive)}
                              disabled={updateMutation.isPending}
                            >
                              {agent.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/admin/agents/$agentId" params={{ agentId: agent.id }}>
                                Edit
                              </Link>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(agent.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, meta.total)} of{' '}
                    {meta.total} agents
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!meta.hasPrevious}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Prev
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!meta.hasNext}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AddAgentDialog
        open={addAgentOpen}
        onOpenChange={setAddAgentOpen}
        onSuccess={handleAgentCreated}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Agent"
        description="Are you sure you want to delete this agent? This action cannot be undone and will also delete all associated documents and images."
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
