import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteImage, getImages, type Image, uploadImage } from '@/api/admin';

export function useImages(agentId?: string) {
  return useQuery<Image[]>({
    queryKey: ['images', agentId],
    queryFn: () => getImages(agentId),
  });
}

export function useUploadImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, agentId }: { file: File; agentId: string }) => uploadImage(file, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });
}
