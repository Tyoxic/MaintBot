import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '../db/database';
import {
  Vehicle,
  MaintenanceItem,
  MaintenanceLogEntry,
  RideLogEntry,
  UserProfile,
} from '../models/types';

interface BackupData {
  version: 1;
  exportedAt: string;
  profile: UserProfile | null;
  vehicles: Vehicle[];
  maintenanceItems: MaintenanceItem[];
  maintenanceLog: MaintenanceLogEntry[];
  rideLog: RideLogEntry[];
}

export async function exportData(): Promise<void> {
  const db = await getDatabase();

  const profile = await db.getFirstAsync<UserProfile>('SELECT * FROM user_profile WHERE id = 1');
  const vehicles = await db.getAllAsync<Vehicle>('SELECT * FROM vehicles');
  const maintenanceItems = await db.getAllAsync<MaintenanceItem>('SELECT * FROM maintenance_items');
  const maintenanceLog = await db.getAllAsync<MaintenanceLogEntry>('SELECT * FROM maintenance_log');
  const rideLog = await db.getAllAsync<RideLogEntry>('SELECT * FROM ride_log');

  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    vehicles,
    maintenanceItems,
    maintenanceLog,
    rideLog,
  };

  const json = JSON.stringify(data, null, 2);
  const fileName = `maintbot-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File(Paths.cache, fileName);

  file.write(json);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export MaintBot Data',
  });
}

export interface ImportSummary {
  vehicles: number;
  maintenanceItems: number;
  maintenanceLog: number;
  rideLog: number;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && value >= 0;
}

function validateBackupData(raw: unknown): BackupData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Backup file is empty or not an object');
  }
  const data = raw as Record<string, unknown>;
  if (data.version !== 1) {
    throw new Error(`Unsupported backup version: ${String(data.version)}`);
  }

  const arrays: (keyof BackupData)[] = ['vehicles', 'maintenanceItems', 'maintenanceLog', 'rideLog'];
  for (const key of arrays) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Backup missing or invalid "${key}" array`);
    }
  }

  const vehicles = data.vehicles as unknown[];
  for (const v of vehicles) {
    if (!v || typeof v !== 'object') throw new Error('Vehicle entry malformed');
    const vehicle = v as Record<string, unknown>;
    if (typeof vehicle.id !== 'number' || typeof vehicle.name !== 'string') {
      throw new Error('Vehicle entry missing id or name');
    }
    if (!isNonNegativeNumber(vehicle.current_hours)) {
      throw new Error(`Vehicle "${vehicle.name}" has invalid current_hours`);
    }
  }

  return data as unknown as BackupData;
}

export async function pickAndImportData(): Promise<ImportSummary | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const fileUri = result.assets[0].uri;
  const pickedFile = new File(fileUri);
  const json = await pickedFile.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Backup file is not valid JSON');
  }

  const data = validateBackupData(parsed);
  return importData(data);
}

async function importData(data: BackupData): Promise<ImportSummary> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // Clear existing data (order matters for foreign keys)
    await db.runAsync('DELETE FROM maintenance_log');
    await db.runAsync('DELETE FROM ride_log');
    await db.runAsync('DELETE FROM maintenance_items');
    await db.runAsync('DELETE FROM vehicles');
    await db.runAsync('DELETE FROM user_profile');

    // Import profile
    if (data.profile) {
      await db.runAsync(
        `INSERT INTO user_profile (id, name, email, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?)`,
        data.profile.name,
        data.profile.email,
        data.profile.created_at,
        data.profile.updated_at
      );
    }

    // Import vehicles
    for (const v of data.vehicles) {
      await db.runAsync(
        `INSERT INTO vehicles (id, name, year, make, model, type, vin, photo_uri, current_hours, reg_expiry, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        v.id, v.name, v.year, v.make, v.model, v.type, v.vin,
        v.photo_uri, v.current_hours, v.reg_expiry, v.created_at, v.updated_at
      );
    }

    // Import maintenance items
    for (const mi of data.maintenanceItems) {
      await db.runAsync(
        `INSERT INTO maintenance_items (id, vehicle_id, name, interval_hours, last_done_hours, is_custom, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        mi.id, mi.vehicle_id, mi.name, mi.interval_hours,
        mi.last_done_hours, mi.is_custom, mi.sort_order, mi.created_at
      );
    }

    // Import maintenance log
    for (const ml of data.maintenanceLog) {
      await db.runAsync(
        `INSERT INTO maintenance_log (id, vehicle_id, maintenance_item_id, item_name, hours_at_service, notes, performed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ml.id, ml.vehicle_id, ml.maintenance_item_id, ml.item_name,
        ml.hours_at_service, ml.notes, ml.performed_at
      );
    }

    // Import ride log
    for (const rl of data.rideLog) {
      await db.runAsync(
        `INSERT INTO ride_log (id, vehicle_id, hours_before, hours_after, notes, logged_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        rl.id, rl.vehicle_id, rl.hours_before, rl.hours_after,
        rl.notes, rl.logged_at
      );
    }
  });

  return {
    vehicles: data.vehicles.length,
    maintenanceItems: data.maintenanceItems.length,
    maintenanceLog: data.maintenanceLog.length,
    rideLog: data.rideLog.length,
  };
}
