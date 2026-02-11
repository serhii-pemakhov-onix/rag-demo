import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AddAgentDialog } from '@/components/admin/AddAgentDialog';
import { StatusBadge } from '@/components/admin/status-badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAgents,
  useArticlesPaginated,
  useDeleteArticle,
  useUploadArticles,
} from '@/hooks/useArticles';

export const Route = createFileRoute('/admin/articles')({
  component: ArticlesPage,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.pdf', '.html', '.docx'];
const PAGE_LIMIT = 20;

const uploadSchema = z.object({
  agentId: z.string().uuid('Please select an agent'),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

function ArticlesPage() {
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const [filterAgentId, setFilterAgentId] = useState<string | undefined>(
    () => localStorage.getItem('agent:articles') ?? undefined,
  );
  const [page, setPage] = useState(1);
  const {
    data: paginatedData,
    isLoading,
    error,
  } = useArticlesPaginated(page, PAGE_LIMIT, filterAgentId);
  const articles = paginatedData?.data;
  const meta = paginatedData?.meta;
  const { upload, uploaded, total, errors: uploadErrors, isUploading } = useUploadArticles();
  const deleteMutation = useDeleteArticle();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      agentId: localStorage.getItem('agent:articles:upload') ?? '',
    },
  });

  const onSubmit = async (data: UploadFormValues) => {
    const files = fileInputRef.current?.files;

    if (!files || files.length === 0) {
      form.setError('root', { message: 'Please select at least one file' });
      return;
    }

    const fileList = Array.from(files);

    for (const file of fileList) {
      if (file.size > MAX_FILE_SIZE) {
        form.setError('root', { message: `${file.name} exceeds 10MB limit` });
        return;
      }
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        form.setError('root', {
          message: `${file.name} has invalid type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        });
        return;
      }
    }

    form.clearErrors('root');

    try {
      const result = await upload(fileList, data.agentId);
      if (result.errors.length > 0) {
        form.setError('root', {
          message: `${result.errors.length} file(s) failed to upload`,
        });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setPage(1);
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
    if (!documentToDelete) {
      return;
    }
    await deleteMutation.mutateAsync(documentToDelete);
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAgentCreated = (agentId: string) => {
    form.setValue('agentId', agentId);
    localStorage.setItem('agent:articles:upload', agentId);
  };

  return (
    <div>
      <h1 className="mb-6 font-bold text-2xl">Documents</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Add documents to an agent's knowledge base. Title is derived from filename.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.formState.errors.root && (
            <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
              {form.formState.errors.root.message}
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div className="mb-4 space-y-1 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
              {uploadErrors.map((err) => (
                <p key={err}>{err}</p>
              ))}
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            localStorage.setItem('agent:articles:upload', value);
                          }}
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

              <div className="space-y-2">
                <FormLabel>Files</FormLabel>
                <FileInput ref={fileInputRef} accept={ALLOWED_EXTENSIONS.join(',')} multiple />
                <FormDescription>
                  Allowed: {ALLOWED_EXTENSIONS.join(', ')} (max 10MB each). Select multiple files at
                  once.
                </FormDescription>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isUploading || agentsLoading}>
                  {isUploading ? `Uploading ${uploaded} of ${total}...` : 'Upload'}
                </Button>
                {isUploading && (
                  <p className="text-muted-foreground text-sm">
                    {uploaded} of {total} uploaded
                  </p>
                )}
              </div>
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
                  setPage(1);
                  if (next) {
                    localStorage.setItem('agent:articles', next);
                  } else {
                    localStorage.removeItem('agent:articles');
                  }
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
            <>
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

              {meta && meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Showing {(page - 1) * PAGE_LIMIT + 1} to{' '}
                    {Math.min(page * PAGE_LIMIT, meta.total)} of {meta.total} documents
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
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
