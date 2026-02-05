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

export async function getActiveAgents(): Promise<Agent[]> {
  return api.get<Agent[]>('/agents/active', { skipAuth: true });
}
