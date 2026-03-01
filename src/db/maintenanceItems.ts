import { getDatabase } from './database';
import { MaintenanceItem } from '../models/types';
import { DEFAULT_MAINTENANCE_ITEMS } from '../utils/constants';

export async function seedDefaultItems(vehicleId: number): Promise<void> {
  const db = await getDatabase();
  for (const item of DEFAULT_MAINTENANCE_ITEMS) {
    await db.runAsync(
      `INSERT INTO maintenance_items (vehicle_id, name, interval_hours, last_done_hours, is_custom, sort_order)
       VALUES (?, ?, ?, 0, 0, ?)`,
      vehicleId,
      item.name,
      item.interval_hours,
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

export async function markItemDone(id: number, hoursAtService: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE maintenance_items SET last_done_hours = ? WHERE id = ?',
    hoursAtService,
    id
  );
}

export async function createCustomItem(
  vehicleId: number,
  name: string,
  intervalHours: number
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO maintenance_items (vehicle_id, name, interval_hours, last_done_hours, is_custom, sort_order)
     VALUES (?, ?, ?, 0, 1, 99)`,
    vehicleId,
    name,
    intervalHours
  );
  return result.lastInsertRowId;
}

export async function updateMaintenanceItem(
  id: number,
  name: string,
  intervalHours: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE maintenance_items SET name = ?, interval_hours = ? WHERE id = ?',
    name,
    intervalHours,
    id
  );
}

export async function deleteMaintenanceItem(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM maintenance_items WHERE id = ?', id);
}
