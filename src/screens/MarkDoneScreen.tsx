import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MaintenanceItem, Vehicle } from '../models/types';
import { getVehicle } from '../db/vehicles';
import { getMaintenanceItem, markItemDone } from '../db/maintenanceItems';
import { addMaintenanceLog } from '../db/maintenanceLog';
import { computeHealth, HEALTH_COLORS } from '../utils/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'MarkDone'>;

export default function MarkDoneScreen({ navigation, route }: Props) {
  const { vehicleId, itemId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [item, setItem] = useState<MaintenanceItem | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      const [v, i] = await Promise.all([getVehicle(vehicleId), getMaintenanceItem(itemId)]);
      setVehicle(v);
      setItem(i);
    })();
  }, [vehicleId, itemId]);

  if (!vehicle || !item) return null;

  const health = computeHealth(item, vehicle.current_hours);

  const handleConfirm = async () => {
    await markItemDone(itemId, vehicle.current_hours);
    await addMaintenanceLog(vehicleId, itemId, item.name, vehicle.current_hours, notes.trim());
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: HEALTH_COLORS[health.health] + '20' }]}>
          <Text style={[styles.statusText, { color: HEALTH_COLORS[health.health] }]}>
            {health.hoursRemaining <= 0
              ? `Overdue by ${Math.abs(health.hoursRemaining).toFixed(1)} hrs`
              : `${health.hoursRemaining.toFixed(1)} hrs remaining`}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Interval</Text>
          <Text style={styles.infoValue}>Every {item.interval_hours} hrs</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last done at</Text>
          <Text style={styles.infoValue}>{item.last_done_hours.toFixed(1)} hrs</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current hours</Text>
          <Text style={styles.infoValue}>{vehicle.current_hours.toFixed(1)} hrs</Text>
        </View>
      </View>

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Parts used, observations, etc."
        multiline
        numberOfLines={3}
      />

      <Text style={styles.confirmText}>
        This will mark "{item.name}" as done at {vehicle.current_hours.toFixed(1)} hours and reset the counter.
      </Text>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
        <Text style={styles.confirmBtnText}>Mark as Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20 },
  itemName: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  statusText: { fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  infoLabel: { fontSize: 14, color: '#888' },
  infoValue: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0',
  },
  notesInput: { height: 80, textAlignVertical: 'top', marginBottom: 20 },
  confirmText: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  confirmBtn: { backgroundColor: '#4CAF50', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
