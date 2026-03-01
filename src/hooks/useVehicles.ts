import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Vehicle } from '../models/types';
import { getAllVehicles } from '../db/vehicles';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllVehicles();
    setVehicles(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { vehicles, loading, refresh };
}
