import type { Agent } from './admin';
import { api } from './client';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatImage {
  id: string;
  url: string;
  filename: string;
  description: string;
}

export interface ChatSource {
  id: string;
  type: 'document' | 'image';
  title: string;
  score: number;
}

export interface ChatResponse {
  response: string;
  images: ChatImage[];
  sources: ChatSource[];
}

export interface ChatRequest {
  message: string;
  agentId: string;
  history?: ChatHistoryMessage[];
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  return api.post<ChatResponse>('/chat', request, { skipAuth: true });
}

export interface StreamChatCallbacks {
  onSources?: (data: { images: ChatImage[]; sources: ChatSource[] }) => void;
  onToken?: (data: { content: string }) => void;
  onDone?: () => void;
  onError?: (data: { message: string }) => void;
}

export async function streamChatMessage(
  request: ChatRequest,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const message = `Stream request failed with status ${response.status}`;
    callbacks.onError?.({ message });
    return;
  }

  if (!response.body) {
    callbacks.onError?.({ message: 'No response body' });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        let eventType = '';
        let data = '';

        for (const line of trimmed.split('\n')) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            data = line.slice(6);
          }
        }

        if (!eventType || !data) continue;

        const parsed = JSON.parse(data);

        switch (eventType) {
          case 'sources':
            callbacks.onSources?.(parsed);
            break;
          case 'token':
            callbacks.onToken?.(parsed);
            break;
          case 'done':
            callbacks.onDone?.();
            break;
          case 'error':
            callbacks.onError?.(parsed);
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function getActiveAgents(): Promise<Agent[]> {
  return api.get<Agent[]>('/agents/active', { skipAuth: true });
}
