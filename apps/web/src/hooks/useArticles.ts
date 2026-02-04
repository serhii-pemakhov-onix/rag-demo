import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type Agent,
  type AgentWithSystemPrompt,
  createAgent,
  type Document,
  deleteDocument,
  getAgents,
  getDocuments,
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
