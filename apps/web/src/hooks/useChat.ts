import { useMutation, useQuery } from '@tanstack/react-query';
import type { Agent } from '@/api/admin';
import { type ChatRequest, type ChatResponse, getActiveAgents, sendChatMessage } from '@/api/chat';

export function useActiveAgents() {
  return useQuery<Agent[]>({
    queryKey: ['agents', 'active'],
    queryFn: getActiveAgents,
  });
}

export function useSendMessage() {
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: sendChatMessage,
  });
}
