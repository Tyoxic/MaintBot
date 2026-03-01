import { getDatabase } from './database';
import { UserProfile } from '../models/types';

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDatabase();
  return db.getFirstAsync<UserProfile>('SELECT * FROM user_profile WHERE id = 1');
}

export async function saveProfile(name: string, email: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO user_profile (id, name, email)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = ?, email = ?, updated_at = datetime('now')`,
    name,
    email,
    name,
    email
  );
}
