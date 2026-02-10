import type { DocumentStatus } from '@/api/admin';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const variants: Record<
    DocumentStatus,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
  > = {
    PENDING: {
      variant: 'outline',
      className: 'border-yellow-500 text-yellow-700 dark:text-yellow-400',
    },
    PROCESSING: { variant: 'default' },
    COMPLETED: {
      variant: 'outline',
      className: 'border-green-500 text-green-700 dark:text-green-400',
    },
    FAILED: { variant: 'destructive' },
  };

  const { variant, className } = variants[status];
  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}
