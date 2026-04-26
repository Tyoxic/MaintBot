import { getDatabase } from './database';
import { MaintenanceItem } from '../models/types';
import { DEFAULT_MAINTENANCE_ITEMS } from '../utils/constants';

export async function seedDefaultItems(vehicleId: number): Promise<void> {
  const db = await getDatabase();
  for (const item of DEFAULT_MAINTENANCE_ITEMS) {
    await db.runAsync(
      `INSERT INTO maintenance_items
        (vehicle_id, name, interval_hours, last_done_hours, interval_miles, last_done_miles, is_custom, sort_order)
       VALUES (?, ?, ?, 0, ?, 0, 0, ?)`,
      vehicleId,
      item.name,
      item.interval_hours,
      item.interval_miles,
      item.sort_order
    );
  }
}

export async function getMaintenanceItems(vehicleId: number): Promise<MaintenanceItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<MaintenanceItem>(
    'SELECT * FROM maintenance_items WHERE vehicle_id = ? ORDER BY sort_order ASC',
    vehicleId
  );
}

export async function getMaintenanceItem(id: number): Promise<MaintenanceItem | null> {
  const db = await getDatabase();
  return db.getFirstAsync<MaintenanceItem>('SELECT * FROM maintenance_items WHERE id = ?', id);
}

export async function markItemDone(
  id: number,
  hoursAtService: number,
  milesAtService: number | null = null
): Promise<void> {
  const db = await getDatabase();
  if (milesAtService !== null) {
    await db.runAsync(
      'UPDATE maintenance_items SET last_done_hours = ?, last_done_miles = ? WHERE id = ?',
      hoursAtService,
      milesAtService,
      id
    );
  } else {
    await db.runAsync(
      'UPDATE maintenance_items SET last_done_hours = ? WHERE id = ?',
      hoursAtService,
      id
    );
  }
}

// Recomputes last_done_hours and last_done_miles from the most recent
// maintenance_log entry for this item. Use after add/edit/delete of log
// entries so health calculations reflect the true latest service.
export async function recomputeLastDoneHours(itemId: number): Promise<void> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    hours_at_service: number;
    miles_at_service: number | null;
  }>(
    `SELECT hours_at_service, miles_at_service FROM maintenance_log
     WHERE maintenance_item_id = ?
     ORDER BY performed_at DESC
     LIMIT 1`,
    itemId
  );
  await db.runAsync(
    'UPDATE maintenance_items SET last_done_hours = ?, last_done_miles = ? WHERE id = ?',
    row?.hours_at_service ?? 0,
    row?.miles_at_service ?? 0,
    itemId
  );
}

export async function createCustomItem(
  vehicleId: number,
  name: string,
  intervalHours: number,
  intervalMiles: number = 0
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO maintenance_items
      (vehicle_id, name, interval_hours, last_done_hours, interval_miles, last_done_miles, is_custom, sort_order)
     VALUES (?, ?, ?, 0, ?, 0, 1, 99)`,
    vehicleId,
    name,
    intervalHours,
    intervalMiles
  );
  return result.lastInsertRowId;
}

export async function updateMaintenanceItem(
  id: number,
  name: string,
  intervalHours: number,
  intervalMiles: number = 0
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE maintenance_items SET name = ?, interval_hours = ?, interval_miles = ? WHERE id = ?',
    name,
    intervalHours,
    intervalMiles,
    id
  );
}

export async function deleteMaintenanceItem(id: number): Promise<void> {
  const db = await getDatabase();
  const item = await db.getFirstAsync<MaintenanceItem>(
    'SELECT * FROM maintenance_items WHERE id = ?',
    id
  );
  await db.runAsync('DELETE FROM maintenance_items WHERE id = ?', id);
  // If deleting a default item, dismiss so it isn't re-suggested
  if (item && item.is_custom === 0) {
    await dismissDefaultItems(item.vehicle_id, [item.name]);
  }
}

export interface DefaultItemSuggestion {
  name: string;
  interval_hours: number;
  interval_miles: number;
  sort_order: number;
}

export async function getMissingDefaultItems(
  vehicleId: number
): Promise<DefaultItemSuggestion[]> {
  const db = await getDatabase();
  const existingItems = await db.getAllAsync<{ name: string }>(
    'SELECT name FROM maintenance_items WHERE vehicle_id = ?',
    vehicleId
  );
  const dismissed = await db.getAllAsync<{ default_name: string }>(
    'SELECT default_name FROM vehicle_default_dismissals WHERE vehicle_id = ?',
    vehicleId
  );
  const existingLower = new Set(existingItems.map((i) => i.name.trim().toLowerCase()));
  const dismissedLower = new Set(dismissed.map((d) => d.default_name.trim().toLowerCase()));
  return DEFAULT_MAINTENANCE_ITEMS.filter((d) => {
    const key = d.name.trim().toLowerCase();
    return !existingLower.has(key) && !dismissedLower.has(key);
  });
}

export interface DefaultItemAddition {
  name: string;
  intervalHours: number;
  intervalMiles: number;
  sortOrder: number;
}

function clampInterval(v: number | undefined | null): number {
  if (v === undefined || v === null || !isFinite(v) || v < 0) return 0;
  return Math.min(v, 999999);
}

export async function addDefaultItems(
  vehicleId: number,
  selections: DefaultItemAddition[]
): Promise<void> {
  if (selections.length === 0) return;
  const db = await getDatabase();
  // Safety: only allow inserting names that exist in DEFAULT_MAINTENANCE_ITEMS
  const allowed = new Set(
    DEFAULT_MAINTENANCE_ITEMS.map((d) => d.name.trim().toLowerCase())
  );
  for (const sel of selections) {
    if (!allowed.has(sel.name.trim().toLowerCase())) continue;
    await db.runAsync(
      `INSERT INTO maintenance_items
        (vehicle_id, name, interval_hours, last_done_hours, interval_miles, last_done_miles, is_custom, sort_order)
       VALUES (?, ?, ?, 0, ?, 0, 0, ?)`,
      vehicleId,
      sel.name,
      clampInterval(sel.intervalHours),
      clampInterval(sel.intervalMiles),
      sel.sortOrder
    );
  }
}

export async function dismissDefaultItems(
  vehicleId: number,
  names: string[]
): Promise<void> {
  if (names.length === 0) return;
  const db = await getDatabase();
  for (const name of names) {
    await db.runAsync(
      `INSERT OR IGNORE INTO vehicle_default_dismissals (vehicle_id, default_name)
       VALUES (?, ?)`,
      vehicleId,
      name.trim()
    );
  }
}
