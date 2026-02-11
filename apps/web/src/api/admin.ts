import { api } from './client';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentWithSystemPrompt extends Agent {
  systemPrompt: string;
  visionPromptInstruction: string | null;
}

export interface Document {
  id: string;
  agentId: string;
  agent: {
    id: string;
    name: string;
    slug: string;
  };
  title: string;
  filename: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  chunkCount: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

// Agents
export async function getAgents(): Promise<Agent[]> {
  return api.get<Agent[]>('/agents');
}

export async function getAgentsPaginated(
  page: number,
  limit: number,
): Promise<PaginatedResponse<Agent>> {
  return api.get<PaginatedResponse<Agent>>(`/agents?page=${page}&limit=${limit}`);
}

export async function getAgent(id: string): Promise<AgentWithSystemPrompt> {
  return api.get<AgentWithSystemPrompt>(`/agents/${id}`);
}

export async function createAgent(
  data: Omit<AgentWithSystemPrompt, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<AgentWithSystemPrompt> {
  return api.post<AgentWithSystemPrompt>('/agents', data);
}

export async function updateAgent(
  id: string,
  data: Partial<Omit<AgentWithSystemPrompt, 'id' | 'slug' | 'createdAt' | 'updatedAt'>>,
): Promise<AgentWithSystemPrompt> {
  return api.put<AgentWithSystemPrompt>(`/agents/${id}`, data);
}

export async function deleteAgent(id: string): Promise<void> {
  await api.delete(`/agents/${id}`);
}

// Documents
export async function getDocuments(agentId?: string): Promise<Document[]> {
  const params = agentId ? `?agentId=${agentId}` : '';
  return api.get<Document[]>(`/documents${params}`);
}

export async function getDocumentsPaginated(
  page: number,
  limit: number,
  agentId?: string,
): Promise<PaginatedResponse<Document>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (agentId) {
    params.set('agentId', agentId);
  }
  return api.get<PaginatedResponse<Document>>(`/documents?${params}`);
}

export async function getDocument(id: string): Promise<Document> {
  return api.get<Document>(`/documents/${id}`);
}

export async function uploadDocument(
  file: File,
  title: string,
  agentId: string,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('agentId', agentId);
  return api.post<Document>('/documents', formData);
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

// Images
export interface ImageDescription {
  subject: string;
  setting: string;
  objects: string[];
  colors: string[];
  text: string | null;
  mood: string;
  style: string;
}

export interface Image {
  id: string;
  agentId: string;
  agent: {
    id: string;
    name: string;
    slug: string;
  };
  filename: string;
  mimeType: string;
  size: number;
  description: ImageDescription | null;
  status: DocumentStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

export async function getImages(agentId?: string): Promise<Image[]> {
  const params = agentId ? `?agentId=${agentId}` : '';
  return api.get<Image[]>(`/images${params}`);
}

export async function uploadImage(file: File, agentId: string): Promise<Image> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('agentId', agentId);
  return api.post<Image>('/images', formData);
}

export async function deleteImage(id: string): Promise<void> {
  await api.delete(`/images/${id}`);
}

// Dashboard
export interface DashboardOverview {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  totalDocuments: number;
  totalImages: number;
  totalChunks: number;
}

export interface AgentContent {
  agentId: string;
  agentName: string;
  documentCount: number;
  imageCount: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'document' | 'image';
  name: string;
  agentName: string;
  status: DocumentStatus;
  createdAt: string;
}

export interface DashboardStats {
  overview: DashboardOverview;
  contentPerAgent: AgentContent[];
  recentActivity: RecentActivityItem[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return api.get<DashboardStats>('/dashboard');
}
