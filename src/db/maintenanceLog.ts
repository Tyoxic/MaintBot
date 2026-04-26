import { getDatabase } from './database';
import { MaintenanceLogEntry } from '../models/types';

export async function addMaintenanceLog(
  vehicleId: number,
  maintenanceItemId: number | null,
  itemName: string,
  hoursAtService: number,
  notes: string = '',
  milesAtService: number | null = null
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO maintenance_log
      (vehicle_id, maintenance_item_id, item_name, hours_at_service, miles_at_service, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    vehicleId,
    maintenanceItemId,
    itemName,
    hoursAtService,
    milesAtService,
    notes
  );
  return result.lastInsertRowId;
}

export async function getMaintenanceLogs(vehicleId: number): Promise<MaintenanceLogEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<MaintenanceLogEntry>(
    'SELECT * FROM maintenance_log WHERE vehicle_id = ? ORDER BY performed_at DESC',
    vehicleId
  );
}

export async function updateMaintenanceLog(
  logId: number,
  hoursAtService: number,
  notes: string,
  milesAtService: number | null = null
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE maintenance_log SET hours_at_service = ?, miles_at_service = ?, notes = ? WHERE id = ?',
    hoursAtService,
    milesAtService,
    notes,
    logId
  );
}

export async function deleteMaintenanceLog(logId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM maintenance_log WHERE id = ?', logId);
}
