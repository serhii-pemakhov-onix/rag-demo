import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getImages,
  uploadImage,
  deleteImage,
  type Image,
} from '@/api/admin';

export function useImages() {
  return useQuery<Image[]>({
    queryKey: ['images'],
    queryFn: getImages,
  });
}

export function useUploadImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadImage(file),
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
