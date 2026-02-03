import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Article {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  size: number;
  isEmbedded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Image {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  description: string | null;
  isEmbedded: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getArticles(): Promise<Article[]> {
  const response = await api.get<Article[]>('/admin/articles');
  return response.data;
}

export async function uploadArticle(file: File, title: string): Promise<Article> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  const response = await api.post<Article>('/admin/articles', formData);
  return response.data;
}

export async function deleteArticle(id: string): Promise<void> {
  await api.delete(`/admin/articles/${id}`);
}

export async function getImages(): Promise<Image[]> {
  const response = await api.get<Image[]>('/admin/images');
  return response.data;
}

export async function uploadImage(file: File): Promise<Image> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<Image>('/admin/images', formData);
  return response.data;
}

export async function deleteImage(id: string): Promise<void> {
  await api.delete(`/admin/images/${id}`);
}
