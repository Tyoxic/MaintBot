import { HealthStatus, MaintenanceItem, MaintenanceItemWithHealth } from '../models/types';

export const HEALTH_COLORS = {
  green: '#4CAF50',
  yellow: '#FF9800',
  red: '#F44336',
} as const;

export function computeHealth(
  item: MaintenanceItem,
  currentHours: number
): MaintenanceItemWithHealth {
  const hoursRemaining = item.interval_hours - (currentHours - item.last_done_hours);
  const percentRemaining = Math.max(0, (hoursRemaining / item.interval_hours) * 100);

  let health: HealthStatus;
  if (percentRemaining > 50) {
    health = 'green';
  } else if (percentRemaining > 25) {
    health = 'yellow';
  } else {
    health = 'red';
  }

  return { ...item, hoursRemaining, percentRemaining, health };
}

export function worstHealth(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('red')) return 'red';
  if (statuses.includes('yellow')) return 'yellow';
  return 'green';
}
