import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import type { Agent } from '@/api/admin';
import {
  type ChatRequest,
  type ChatResponse,
  getActiveAgents,
  type StreamChatCallbacks,
  sendChatMessage,
  streamChatMessage,
} from '@/api/chat';

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

export interface StreamState {
  isStreaming: boolean;
  isPreprocessing: boolean;
}

export function useStreamChat() {
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    isPreprocessing: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreamState({ isStreaming: false, isPreprocessing: false });
  }, []);

  const sendStream = useCallback(async (request: ChatRequest, callbacks: StreamChatCallbacks) => {
    // Abort any previous stream
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStreamState({ isStreaming: true, isPreprocessing: true });

    try {
      await streamChatMessage(
        request,
        {
          onSources: (data) => {
            callbacks.onSources?.(data);
          },
          onToken: (data) => {
            setStreamState({ isStreaming: true, isPreprocessing: false });
            callbacks.onToken?.(data);
          },
          onDone: () => {
            setStreamState({ isStreaming: false, isPreprocessing: false });
            callbacks.onDone?.();
          },
          onError: (data) => {
            setStreamState({ isStreaming: false, isPreprocessing: false });
            callbacks.onError?.(data);
          },
        },
        controller.signal,
      );
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setStreamState({ isStreaming: false, isPreprocessing: false });
        callbacks.onError?.({
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  return { streamState, sendStream, abort };
}
