import { useQuery } from '@tanstack/react-query';
import { type DashboardStats, getDashboardStats } from '@/api/admin';

export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
  });
}
