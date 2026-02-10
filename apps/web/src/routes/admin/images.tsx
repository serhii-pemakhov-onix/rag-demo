import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
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
import { useAgents } from '@/hooks/useArticles';
import { useDeleteImage, useImages, useUploadImage } from '@/hooks/useImages';

export const Route = createFileRoute('/admin/images')({
  component: ImagesPage,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const _ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const uploadSchema = z.object({
  agentId: z.string().uuid('Please select an agent'),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

function ImagesPage() {
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const [filterAgentId, setFilterAgentId] = useState<string | undefined>(
    () => localStorage.getItem('agent:images:filter') ?? undefined,
  );
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
      agentId: localStorage.getItem('agent:images:upload') ?? '',
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
    if (!imageToDelete) {
      return;
    }
    await deleteMutation.mutateAsync(imageToDelete);
    setDeleteDialogOpen(false);
    setImageToDelete(null);
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
  };

  return (
    <div>
      <h1 className="mb-6 font-bold text-2xl">Images</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>Add a new image to an agent's knowledge base</CardDescription>
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            localStorage.setItem('agent:images:upload', value);
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
                <FormLabel>Image File</FormLabel>
                <FileInput ref={fileInputRef} accept="image/*" />
                <FormDescription>Supported formats: JPG, PNG, GIF, WebP (max 5MB)</FormDescription>
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
                onValueChange={(value) => {
                  const next = value === 'all' ? undefined : value;
                  setFilterAgentId(next);
                  if (next) {
                    localStorage.setItem('agent:images:filter', next);
                  } else {
                    localStorage.removeItem('agent:images:filter');
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
          {error && <p className="text-destructive">Failed to load images</p>}
          {images && images.length === 0 && (
            <p className="text-muted-foreground">No images yet. Upload one above.</p>
          )}
          {images && images.length > 0 && (
            <div className="space-y-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{image.filename}</p>
                      <StatusBadge status={image.status} />
                    </div>
                    <p className="truncate text-muted-foreground text-sm">
                      {image.agent.name} &middot; {formatSize(image.size)}
                    </p>
                    {image.description && (
                      <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                        {image.description.subject}
                      </p>
                    )}
                    {image.error && <p className="mt-1 text-destructive text-sm">{image.error}</p>}
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
