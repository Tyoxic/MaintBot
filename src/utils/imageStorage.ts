import { File, Directory, Paths } from 'expo-file-system';

const PHOTOS_DIR = 'vehicle_photos';

function getPhotosDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTOS_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export function persistVehiclePhoto(sourceUri: string): string {
  const dir = getPhotosDirectory();
  const extension = sourceUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const filename = `vehicle_${Date.now()}_${Math.floor(Math.random() * 100000)}.${extension}`;

  const sourceFile = new File(sourceUri);
  const destFile = new File(dir, filename);
  sourceFile.copy(destFile);

  return destFile.uri;
}

export function deleteVehiclePhoto(photoUri: string): void {
  if (!photoUri) return;
  const dir = getPhotosDirectory();
  if (!photoUri.startsWith(dir.uri)) return;

  try {
    const file = new File(photoUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Silent — photo cleanup shouldn't block user action
  }
}
