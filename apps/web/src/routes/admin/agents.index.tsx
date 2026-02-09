import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddAgentDialog } from '@/components/admin/AddAgentDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAgentsPaginated, useDeleteAgent, useUpdateAgent } from '@/hooks/useAgents';

export const Route = createFileRoute('/admin/agents/')({
  component: AgentsIndexPage,
});

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>
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
    if (!agentToDelete) {
      return;
    }
    await deleteMutation.mutateAsync(agentToDelete);
    setDeleteDialogOpen(false);
    setAgentToDelete(null);
  };

  const handleAgentCreated = () => {
    setPage(1);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-bold text-2xl">Agents</h1>
        <Button onClick={() => setAddAgentOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell className="text-muted-foreground">{agent.slug}</TableCell>
                        <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                          {agent.description || '-'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge isActive={agent.isActive} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-24"
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
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
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Prev
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      Page {page} of {meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!meta.hasNext}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
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
