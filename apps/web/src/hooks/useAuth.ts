import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  login as apiLogin,
  logout as apiLogout,
  getStoredAuth,
  setStoredAuth,
  clearStoredAuth,
  type User,
} from '@/api/auth';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: authState } = useQuery<AuthState>({
    queryKey: ['auth'],
    queryFn: () => {
      const { accessToken, user } = getStoredAuth();
      return {
        accessToken,
        user,
        isAuthenticated: !!accessToken,
      };
    },
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiLogin(email, password),
    onSuccess: (data) => {
      setStoredAuth(data.accessToken, data.user);
      queryClient.setQueryData<AuthState>(['auth'], {
        accessToken: data.accessToken,
        user: data.user,
        isAuthenticated: true,
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      clearStoredAuth();
      queryClient.setQueryData<AuthState>(['auth'], {
        accessToken: null,
        user: null,
        isAuthenticated: false,
      });
    },
  });

  return {
    user: authState?.user ?? null,
    isAuthenticated: authState?.isAuthenticated ?? false,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
  };
}
