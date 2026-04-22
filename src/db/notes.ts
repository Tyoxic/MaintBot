import { getDatabase } from './database';
import { VehicleNote } from '../models/types';

export async function getNotes(vehicleId: number): Promise<VehicleNote[]> {
  const db = await getDatabase();
  return db.getAllAsync<VehicleNote>(
    `SELECT * FROM vehicle_notes
     WHERE vehicle_id = ?
     ORDER BY pinned DESC, updated_at DESC`,
    vehicleId
  );
}

export async function searchNotes(
  vehicleId: number,
  query: string
): Promise<VehicleNote[]> {
  const db = await getDatabase();
  const pattern = `%${query}%`;
  return db.getAllAsync<VehicleNote>(
    `SELECT * FROM vehicle_notes
     WHERE vehicle_id = ?
       AND (title LIKE ? OR content LIKE ?)
     ORDER BY pinned DESC, updated_at DESC`,
    vehicleId,
    pattern,
    pattern
  );
}

export async function getNote(id: number): Promise<VehicleNote | null> {
  const db = await getDatabase();
  return db.getFirstAsync<VehicleNote>(
    'SELECT * FROM vehicle_notes WHERE id = ?',
    id
  );
}

export async function createNote(
  vehicleId: number,
  title: string,
  content: string = ''
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO vehicle_notes (vehicle_id, title, content)
     VALUES (?, ?, ?)`,
    vehicleId,
    title,
    content
  );
  return result.lastInsertRowId;
}

export async function updateNoteContent(
  id: number,
  content: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE vehicle_notes
     SET content = ?, updated_at = datetime('now')
     WHERE id = ?`,
    content,
    id
  );
}

export async function renameNote(id: number, title: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE vehicle_notes
     SET title = ?, updated_at = datetime('now')
     WHERE id = ?`,
    title,
    id
  );
}

export async function togglePinNote(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE vehicle_notes
     SET pinned = CASE pinned WHEN 1 THEN 0 ELSE 1 END,
         updated_at = datetime('now')
     WHERE id = ?`,
    id
  );
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM vehicle_notes WHERE id = ?', id);
}
