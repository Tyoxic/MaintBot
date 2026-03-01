import { getDatabase } from './database';
import { RideLogEntry } from '../models/types';

export async function addRideLog(
  vehicleId: number,
  hoursBefore: number,
  hoursAfter: number,
  notes: string = ''
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO ride_log (vehicle_id, hours_before, hours_after, notes)
     VALUES (?, ?, ?, ?)`,
    vehicleId,
    hoursBefore,
    hoursAfter,
    notes
  );
  return result.lastInsertRowId;
}

export async function getRideLogs(vehicleId: number): Promise<RideLogEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<RideLogEntry>(
    'SELECT * FROM ride_log WHERE vehicle_id = ? ORDER BY logged_at DESC',
    vehicleId
  );
}
