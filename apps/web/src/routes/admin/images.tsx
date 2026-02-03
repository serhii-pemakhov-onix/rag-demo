import { useRef, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useImages, useUploadImage, useDeleteImage } from '@/hooks/useImages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/admin/images')({
  component: ImagesPage,
});

function ImagesPage() {
  const { data: images, isLoading, error } = useImages();
  const uploadMutation = useUploadImage();
  const deleteMutation = useDeleteImage();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    try {
      await uploadMutation.mutateAsync(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    await deleteMutation.mutateAsync(id);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Images</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>Add a new image to the knowledge base</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Image File</Label>
              <Input
                id="file"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                required
              />
            </div>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
            {uploadMutation.error && (
              <p className="text-sm text-destructive">
                {uploadMutation.error instanceof Error
                  ? uploadMutation.error.message
                  : 'Upload failed'}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image List</CardTitle>
          <CardDescription>Manage your uploaded images</CardDescription>
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
                  <div>
                    <p className="font-medium">{image.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatSize(image.size)} •{' '}
                      {image.isEmbedded ? (
                        <span className="text-green-600">Embedded</span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </p>
                    {image.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {image.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(image.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
