import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { DocumentStatus } from '@/api/admin';
import { AddAgentDialog } from '@/components/admin/AddAgentDialog';
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
import { useAgents } from '@/hooks/useArticles';
import { useDeleteImage, useImages, useUploadImage } from '@/hooks/useImages';

export const Route = createFileRoute('/admin/images')({
  component: ImagesPage,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const uploadSchema = z.object({
  agentId: z.string().uuid('Please select an agent'),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles: Record<DocumentStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function ImagesPage() {
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const [filterAgentId, setFilterAgentId] = useState<string | undefined>();
  const { data: images, isLoading, error } = useImages(filterAgentId);
  const uploadMutation = useUploadImage();
  const deleteMutation = useDeleteImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
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
      form.setError('root', { message: 'File size exceeds 5MB limit' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      form.setError('root', { message: 'Please select an image file' });
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file,
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
    setImageToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!imageToDelete) return;
    await deleteMutation.mutateAsync(imageToDelete);
    setDeleteDialogOpen(false);
    setImageToDelete(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAgentCreated = (agentId: string) => {
    form.setValue('agentId', agentId);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Images</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>Add a new image to an agent's knowledge base</CardDescription>
        </CardHeader>
        <CardContent>
          {form.formState.errors.root && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-sm">
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
                        <p className="text-sm text-muted-foreground">No agents available.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAddAgentOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
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

              <div className="space-y-2">
                <FormLabel>Image File</FormLabel>
                <FileInput ref={fileInputRef} accept="image/*" />
                <FormDescription>
                  Supported formats: JPG, PNG, GIF, WebP (max 5MB)
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
              <CardTitle>Image List</CardTitle>
              <CardDescription>Manage your uploaded images</CardDescription>
            </div>
            <div className="w-48">
              <Select
                value={filterAgentId || 'all'}
                onValueChange={(value) => setFilterAgentId(value === 'all' ? undefined : value)}
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
          {error && <p className="text-destructive">Failed to load images</p>}
          {images && images.length === 0 && (
            <p className="text-muted-foreground">No images yet. Upload one above.</p>
          )}
          {images && images.length > 0 && (
            <div className="space-y-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{image.filename}</p>
                      <StatusBadge status={image.status} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {image.agent.name} &middot; {formatSize(image.size)}
                    </p>
                    {image.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {image.description.subject}
                      </p>
                    )}
                    {image.error && (
                      <p className="text-sm text-destructive mt-1">{image.error}</p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(image.id)}
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
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
