import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type Agent,
  type AgentWithSystemPrompt,
  deleteAgent,
  getAgent,
  getAgentsPaginated,
  type PaginatedResponse,
  updateAgent,
} from '@/api/admin';

export function useAgentsPaginated(page: number, limit: number) {
  return useQuery<PaginatedResponse<Agent>>({
    queryKey: ['agents', 'paginated', page, limit],
    queryFn: () => getAgentsPaginated(page, limit),
  });
}

export function useAgent(id: string) {
  return useQuery<AgentWithSystemPrompt>({
    queryKey: ['agents', id],
    queryFn: () => getAgent(id),
    enabled: !!id,
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<AgentWithSystemPrompt, 'id' | 'slug' | 'createdAt' | 'updatedAt'>>;
    }) => updateAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
