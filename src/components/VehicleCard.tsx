import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Vehicle, HealthStatus } from '../models/types';
import { getMaintenanceItems } from '../db/maintenanceItems';
import { computeHealth, worstHealth } from '../utils/colors';
import HealthIndicator from './HealthIndicator';

interface Props {
  vehicle: Vehicle;
  onPress: () => void;
}

export default function VehicleCard({ vehicle, onPress }: Props) {
  const [health, setHealth] = useState<HealthStatus>('green');

  useEffect(() => {
    (async () => {
      const items = await getMaintenanceItems(vehicle.id);
      const statuses = items.map((i) => computeHealth(i, vehicle.current_hours, vehicle.current_miles ?? 0).health);
      setHealth(worstHealth(statuses));
    })();
  }, [vehicle]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {vehicle.photo_uri ? (
        <Image source={{ uri: vehicle.photo_uri }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.placeholderIcon}>🏍️</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <HealthIndicator status={health} />
          <Text style={styles.name} numberOfLines={1}>{vehicle.name}</Text>
        </View>
        <Text style={styles.detail}>
          {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make} {vehicle.model}
        </Text>
        <Text style={styles.hours}>
          {vehicle.current_hours.toFixed(1)} hrs
          {vehicle.current_miles && vehicle.current_miles > 0
            ? `  ·  ${vehicle.current_miles.toLocaleString()} mi`
            : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  photo: { width: 90, height: 90 },
  photoPlaceholder: {
    width: 90, height: 90, backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center',
  },
  placeholderIcon: { fontSize: 32 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  detail: { fontSize: 13, color: '#666', marginBottom: 2 },
  hours: { fontSize: 13, color: '#888', fontWeight: '600' },
});
