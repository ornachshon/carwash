import type { WashJobStatus } from '../types/database';
import { colors } from '../theme';

export const STATUS_LABELS: Record<WashJobStatus, string> = {
  requested: 'Requested',
  accepted: 'Accepted',
  en_route: 'En route',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  paid: 'Paid',
};

export const STATUS_COLORS: Record<WashJobStatus, string> = {
  requested: colors.textSecondary,
  accepted: colors.primary,
  en_route: colors.warning,
  in_progress: '#EAB308',
  completed: colors.success,
  cancelled: colors.error,
  paid: colors.success,
};

export function formatStatusTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
