import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { MaintenanceItemWithHealth } from '../models/types';
import { getMaintenanceItems } from '../db/maintenanceItems';
import { getVehicle } from '../db/vehicles';
import { computeHealth } from '../utils/colors';

export function useMaintenanceItems(vehicleId: number) {
  const [items, setItems] = useState<MaintenanceItemWithHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const vehicle = await getVehicle(vehicleId);
    if (!vehicle) {
      setItems([]);
      setLoading(false);
      return;
    }
    const rawItems = await getMaintenanceItems(vehicleId);
    const withHealth = rawItems.map((item) => computeHealth(item, vehicle.current_hours, vehicle.current_miles ?? 0));
    setItems(withHealth);
    setLoading(false);
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { items, loading, refresh };
}
