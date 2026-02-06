import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { DocumentStatus } from '@/api/admin';
import { AddAgentDialog } from '@/components/admin/AddAgentDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { FileInput } from '@/components/ui/file-input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgents, useArticles, useDeleteArticle, useUploadArticle } from '@/hooks/useArticles';

export const Route = createFileRoute('/admin/articles')({
  component: ArticlesPage,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf', '.html', '.docx'];

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  agentId: z.string().uuid('Please select an agent'),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

function StatusBadge({ status }: { status: DocumentStatus }) {
  const variants: Record<
    DocumentStatus,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
  > = {
    PENDING: {
      variant: 'outline',
      className: 'border-yellow-500 text-yellow-700 dark:text-yellow-400',
    },
    PROCESSING: { variant: 'default' },
    COMPLETED: {
      variant: 'outline',
      className: 'border-green-500 text-green-700 dark:text-green-400',
    },
    FAILED: { variant: 'destructive' },
  };

  const { variant, className } = variants[status];
  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}

function ArticlesPage() {
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const [filterAgentId, setFilterAgentId] = useState<string | undefined>(
    () => localStorage.getItem('agent:articles') ?? undefined,
  );
  const { data: articles, isLoading, error } = useArticles(filterAgentId);
  const uploadMutation = useUploadArticle();
  const deleteMutation = useDeleteArticle();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      agentId: '',
    },
  });

  const onSubmit = async (data: UploadFormValues) => {
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      form.setError('root', { message: 'Please select a file' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      form.setError('root', { message: 'File size exceeds 10MB limit' });
      return;
    }

    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      form.setError('root', {
        message: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      });
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file,
        title: data.title,
        agentId: data.agentId,
      });
      form.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) { return; }
    await deleteMutation.mutateAsync(documentToDelete);
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) { return `${bytes} B`; }
    if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAgentCreated = (agentId: string) => {
    form.setValue('agentId', agentId);
  };

  return (
    <div>
      <h1 className="mb-6 font-bold text-2xl">Documents</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Add a new document to an agent's knowledge base</CardDescription>
        </CardHeader>
        <CardContent>
          {form.formState.errors.root && (
            <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
              {form.formState.errors.root.message}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent</FormLabel>
                    {!agentsLoading && (!agents || agents.length === 0) ? (
                      <div className="flex items-center gap-2">
                        <p className="text-muted-foreground text-sm">No agents available.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAddAgentOpen(true)}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Create Agent
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={agentsLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select an agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agents?.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setAddAgentOpen(true)}
                          title="Add new agent"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Document title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>File</FormLabel>
                <FileInput ref={fileInputRef} accept={ALLOWED_EXTENSIONS.join(',')} />
                <FormDescription>
                  Allowed: {ALLOWED_EXTENSIONS.join(', ')} (max 10MB)
                </FormDescription>
              </div>

              <Button type="submit" disabled={uploadMutation.isPending || agentsLoading}>
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document List</CardTitle>
              <CardDescription>Manage your uploaded documents</CardDescription>
            </div>
            <div className="w-48">
              <Select
                value={filterAgentId || 'all'}
                onValueChange={(value) => {
                  const next = value === 'all' ? undefined : value;
                  setFilterAgentId(next);
                  if (next) { localStorage.setItem('agent:articles', next); }
                  else { localStorage.removeItem('agent:articles'); }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {agents?.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading...</p>}
          {error && <p className="text-destructive">Failed to load documents</p>}
          {articles && articles.length === 0 && (
            <p className="text-muted-foreground">No documents yet. Upload one above.</p>
          )}
          {articles && articles.length > 0 && (
            <div className="space-y-2">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{article.title}</p>
                      <StatusBadge status={article.status} />
                    </div>
                    <p className="truncate text-muted-foreground text-sm">
                      {article.agent.name} &middot; {article.filename} &middot;{' '}
                      {formatSize(article.size)}
                    </p>
                    {article.error && (
                      <p className="mt-1 text-destructive text-sm">{article.error}</p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(article.id)}
                    className="ml-4 flex-shrink-0"
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
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
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
