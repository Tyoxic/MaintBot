import { getDatabase } from './database';
import { Vehicle, VehicleType } from '../models/types';

export interface CreateVehicleInput {
  name: string;
  year?: number | null;
  make?: string;
  model?: string;
  type?: VehicleType;
  vin?: string;
  photo_uri?: string;
  current_hours?: number;
  current_miles?: number;
  reg_expiry?: string | null;
}

export async function createVehicle(input: CreateVehicleInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO vehicles (name, year, make, model, type, vin, photo_uri, current_hours, current_miles, reg_expiry)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.name,
    input.year ?? null,
    input.make ?? '',
    input.model ?? '',
    input.type ?? 'dirtbike',
    input.vin ?? '',
    input.photo_uri ?? '',
    input.current_hours ?? 0,
    input.current_miles ?? 0,
    input.reg_expiry ?? null
  );
  return result.lastInsertRowId;
}

export async function getAllVehicles(): Promise<Vehicle[]> {
  const db = await getDatabase();
  return db.getAllAsync<Vehicle>('SELECT * FROM vehicles ORDER BY created_at DESC');
}

export async function getVehicle(id: number): Promise<Vehicle | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Vehicle>('SELECT * FROM vehicles WHERE id = ?', id);
}

const ALLOWED_UPDATE_FIELDS: readonly (keyof CreateVehicleInput)[] = [
  'name',
  'year',
  'make',
  'model',
  'type',
  'vin',
  'photo_uri',
  'current_hours',
  'current_miles',
  'reg_expiry',
];

export async function updateVehicle(id: number, input: Partial<CreateVehicleInput>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const key of ALLOWED_UPDATE_FIELDS) {
    const value = input[key];
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  await db.runAsync(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function updateVehicleHours(id: number, hours: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE vehicles SET current_hours = ?, updated_at = datetime('now') WHERE id = ?`,
    hours,
    id
  );
}

export async function updateVehicleMiles(id: number, miles: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE vehicles SET current_miles = ?, updated_at = datetime('now') WHERE id = ?`,
    miles,
    id
  );
}

export async function deleteVehicle(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', id);
}
