import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getArticles,
  uploadArticle,
  deleteArticle,
  type Article,
} from '@/api/admin';

export function useArticles() {
  return useQuery<Article[]>({
    queryKey: ['articles'],
    queryFn: getArticles,
  });
}

export function useUploadArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, title }: { file: File; title: string }) =>
      uploadArticle(file, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}
