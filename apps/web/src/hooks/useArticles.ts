import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  type Agent,
  type AgentWithSystemPrompt,
  createAgent,
  type Document,
  deleteDocument,
  getAgents,
  getDocuments,
  getDocumentsPaginated,
  type PaginatedResponse,
  uploadDocument,
} from '@/api/admin';

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: getAgents,
  });
}

export function useArticles(agentId?: string) {
  return useQuery<Document[]>({
    queryKey: ['documents', agentId],
    queryFn: () => getDocuments(agentId),
  });
}

export function useArticlesPaginated(page: number, limit: number, agentId?: string) {
  return useQuery<PaginatedResponse<Document>>({
    queryKey: ['documents', 'paginated', page, limit, agentId],
    queryFn: () => getDocumentsPaginated(page, limit, agentId),
  });
}

export function useUploadArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, title, agentId }: { file: File; title: string; agentId: string }) =>
      uploadDocument(file, title, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

const CONCURRENCY_LIMIT = 5;

function deriveTitle(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

export function useUploadArticles() {
  const queryClient = useQueryClient();
  const [uploaded, setUploaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const abortRef = useRef(false);

  const upload = useCallback(
    async (files: File[], agentId: string) => {
      setUploaded(0);
      setTotal(files.length);
      setErrors([]);
      setIsUploading(true);
      abortRef.current = false;

      const uploadErrors: string[] = [];
      let completedCount = 0;

      // Process files with concurrency limit
      const queue = [...files];
      const workers = Array.from(
        { length: Math.min(CONCURRENCY_LIMIT, queue.length) },
        async () => {
          while (queue.length > 0 && !abortRef.current) {
            const file = queue.shift()!;
            try {
              await uploadDocument(file, deriveTitle(file.name), agentId);
            } catch (err) {
              uploadErrors.push(
                `${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`,
              );
            }
            completedCount++;
            setUploaded(completedCount);
          }
        },
      );

      await Promise.all(workers);

      setErrors(uploadErrors);
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      return { uploaded: completedCount - uploadErrors.length, errors: uploadErrors };
    },
    [queryClient],
  );

  return { upload, uploaded, total, errors, isUploading };
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<AgentWithSystemPrompt, 'id' | 'createdAt' | 'updatedAt'>) =>
      createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
