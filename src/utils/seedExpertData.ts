import { getDatabase } from '../db/database';

/**
 * One-time seed of historical maintenance data for the TE 300.
 * Cleans up duplicates, sets exact column order, inserts spreadsheet data.
 */
export async function seedTE300Data(): Promise<string> {
  const db = await getDatabase();

  // Find the TE 300 vehicle
  const vehicle = await db.getFirstAsync<{ id: number; current_hours: number }>(
    `SELECT id, current_hours FROM vehicles WHERE name LIKE '%te 300%' OR name LIKE '%TE 300%' OR name LIKE '%TE300%' OR name LIKE '%te300%' LIMIT 1`
  );
  if (!vehicle) return 'Vehicle "TE 300" not found.';

  const vid = vehicle.id;

  // Nuke all maintenance_log for this vehicle
  await db.runAsync('DELETE FROM maintenance_log WHERE vehicle_id = ?', vid);

  // Nuke ALL maintenance_items for this vehicle — start fresh
  await db.runAsync('DELETE FROM maintenance_items WHERE vehicle_id = ?', vid);

  // Desired columns in exact order:
  // Date | Air Filter | Oil Change | Rear Tire | Front Tire | Fork Oil | Shock Oil | Coolant
  const columns: { name: string; sort: number }[] = [
    { name: 'Air Filter', sort: 1 },
    { name: 'Oil Change', sort: 2 },
    { name: 'Rear Tire', sort: 3 },
    { name: 'Front Tire', sort: 4 },
    { name: 'Fork Oil', sort: 5 },
    { name: 'Shock Oil', sort: 6 },
    { name: 'Coolant', sort: 7 },
  ];

  // Create all items fresh with correct order (all track-only, interval=0)
  const itemIds: Record<string, number> = {};
  for (const col of columns) {
    const result = await db.runAsync(
      `INSERT INTO maintenance_items (vehicle_id, name, interval_hours, last_done_hours, is_custom, sort_order)
       VALUES (?, ?, 0, 0, 0, ?)`,
      vid, col.name, col.sort
    );
    itemIds[col.name] = result.lastInsertRowId;
  }

  // Spreadsheet data: [date, itemName, hours, notes]
  const entries: [string, string, number, string][] = [
    // 9/18/2025 — Oil Change=1, Front Tire=1, Coolant=1, Notes: Tusk Recon Hybrid Tire
    ['2025-09-18', 'Oil Change', 1, ''],
    ['2025-09-18', 'Front Tire', 1, ''],
    ['2025-09-18', 'Coolant', 1, 'Tusk Recon Hybrid Tire'],
    // 9/22/25 — Rear Tire=3
    ['2025-09-22', 'Rear Tire', 3, ''],
    // 9/27/25 — Rear Tire=8
    ['2025-09-27', 'Rear Tire', 8, ''],
    // 10/09/25 — Rear Tire=13
    ['2025-10-09', 'Rear Tire', 13, ''],
    // 10/12/25 — Oil Change=16, Coolant=16
    ['2025-10-12', 'Oil Change', 16, ''],
    ['2025-10-12', 'Coolant', 16, ''],
    // 11/4/2025 — Rear Tire=24
    ['2025-11-04', 'Rear Tire', 24, ''],
    // 12/16/2025 — Oil Change=33, Coolant=33
    ['2025-12-16', 'Oil Change', 33, ''],
    ['2025-12-16', 'Coolant', 33, ''],
    // 1/23/2026 — Rear Tire=45, Air Filter=45
    ['2026-01-23', 'Rear Tire', 45, ''],
    ['2026-01-23', 'Air Filter', 45, 'New air filter'],
    // 2/1/2026 — Rear Tire=52
    ['2026-02-01', 'Rear Tire', 52, ''],
    // 2/7/2026 — Oil Change=55
    ['2026-02-07', 'Oil Change', 55, ''],
    // 2/13 — Rear Tire=58
    ['2026-02-13', 'Rear Tire', 58, ''],
    // 2/27 — Rear Tire=60
    ['2026-02-27', 'Rear Tire', 60, ''],
    // 3/5 — Rear Tire=63
    ['2026-03-05', 'Rear Tire', 63, ''],
    // 3/8 — Rear Tire=67
    ['2026-03-08', 'Rear Tire', 67, ''],
  ];

  let inserted = 0;
  for (const [date, itemName, hours, notes] of entries) {
    const itemId = itemIds[itemName];
    if (!itemId) continue;
    await db.runAsync(
      `INSERT INTO maintenance_log (vehicle_id, maintenance_item_id, item_name, hours_at_service, notes, performed_at)
       VALUES (?, ?, ?, ?, ?, datetime(?))`,
      vid, itemId, itemName, hours, notes, date
    );
    inserted++;
  }

  // Update last_done_hours for each item
  for (const col of columns) {
    const itemId = itemIds[col.name];
    const maxLog = await db.getFirstAsync<{ max_hours: number }>(
      `SELECT MAX(hours_at_service) as max_hours FROM maintenance_log WHERE vehicle_id = ? AND maintenance_item_id = ?`,
      vid, itemId
    );
    if (maxLog && maxLog.max_hours > 0) {
      await db.runAsync(
        'UPDATE maintenance_items SET last_done_hours = ? WHERE id = ?',
        maxLog.max_hours, itemId
      );
    }
  }

  return `Done! Deleted old items & logs. Created 7 columns in order: Air Filter, Oil Change, Rear Tire, Front Tire, Fork Oil, Shock Oil, Coolant. Inserted ${inserted} entries.`;
}
