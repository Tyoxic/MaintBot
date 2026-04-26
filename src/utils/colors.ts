import { HealthStatus, MaintenanceItem, MaintenanceItemWithHealth } from '../models/types';

export const HEALTH_COLORS = {
  green: '#4CAF50',
  yellow: '#FF9800',
  red: '#F44336',
} as const;

export function computeHealth(
  item: MaintenanceItem,
  currentHours: number,
  currentMiles: number = 0
): MaintenanceItemWithHealth {
  const hasHoursInterval = item.interval_hours > 0;
  const hasMilesInterval = item.interval_miles > 0;

  // Items with neither interval are "track only" — always green, no countdown
  if (!hasHoursInterval && !hasMilesInterval) {
    return {
      ...item,
      hoursRemaining: 0,
      milesRemaining: 0,
      percentRemaining: 100,
      health: 'green',
      drivenBy: 'none',
    };
  }

  // Compute remaining for each tracked dimension
  const hoursRemaining = hasHoursInterval
    ? item.interval_hours - (currentHours - item.last_done_hours)
    : Number.POSITIVE_INFINITY;
  const milesRemaining = hasMilesInterval
    ? item.interval_miles - (currentMiles - item.last_done_miles)
    : Number.POSITIVE_INFINITY;

  const hoursPct = hasHoursInterval
    ? Math.max(0, (hoursRemaining / item.interval_hours) * 100)
    : Number.POSITIVE_INFINITY;
  const milesPct = hasMilesInterval
    ? Math.max(0, (milesRemaining / item.interval_miles) * 100)
    : Number.POSITIVE_INFINITY;

  // Whichever dimension is closer to overdue (lower percent) drives the status
  const drivenBy: 'hours' | 'miles' = hoursPct <= milesPct ? 'hours' : 'miles';
  const percentRemaining = Math.min(hoursPct, milesPct);

  let health: HealthStatus;
  if (percentRemaining > 50) {
    health = 'green';
  } else if (percentRemaining > 25) {
    health = 'yellow';
  } else {
    health = 'red';
  }

  return {
    ...item,
    hoursRemaining: hasHoursInterval ? hoursRemaining : 0,
    milesRemaining: hasMilesInterval ? milesRemaining : 0,
    percentRemaining,
    health,
    drivenBy,
  };
}

export function worstHealth(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('red')) return 'red';
  if (statuses.includes('yellow')) return 'yellow';
  return 'green';
}
