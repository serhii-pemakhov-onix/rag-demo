import { useState, useRef, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useArticles, useUploadArticle, useDeleteArticle } from '@/hooks/useArticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/admin/articles')({
  component: ArticlesPage,
});

function ArticlesPage() {
  const { data: articles, isLoading, error } = useArticles();
  const uploadMutation = useUploadArticle();
  const deleteMutation = useDeleteArticle();

  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !title.trim()) return;

    try {
      await uploadMutation.mutateAsync({ file, title: title.trim() });
      setTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    await deleteMutation.mutateAsync(id);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Articles</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Article</CardTitle>
          <CardDescription>Add a new article to the knowledge base</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input id="file" type="file" ref={fileInputRef} required />
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
          <CardTitle>Article List</CardTitle>
          <CardDescription>Manage your uploaded articles</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading...</p>}
          {error && (
            <p className="text-destructive">Failed to load articles</p>
          )}
          {articles && articles.length === 0 && (
            <p className="text-muted-foreground">No articles yet. Upload one above.</p>
          )}
          {articles && articles.length > 0 && (
            <div className="space-y-2">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <p className="font-medium">{article.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {article.filename} • {formatSize(article.size)} •{' '}
                      {article.isEmbedded ? (
                        <span className="text-green-600">Embedded</span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(article.id)}
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
