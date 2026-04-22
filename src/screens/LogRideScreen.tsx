import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, MaintenanceItemWithHealth } from '../models/types';
import { getVehicle, updateVehicleHours } from '../db/vehicles';
import { getMaintenanceItems } from '../db/maintenanceItems';
import { addRideLog } from '../db/rideLog';
import { computeHealth, HEALTH_COLORS } from '../utils/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'LogRide'>;

export default function LogRideScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const [currentHours, setCurrentHours] = useState(0);
  const [newHours, setNewHours] = useState('');
  const [notes, setNotes] = useState('');
  const [dueItems, setDueItems] = useState<MaintenanceItemWithHealth[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const v = await getVehicle(vehicleId);
      if (v) {
        setCurrentHours(v.current_hours);
        setNewHours(v.current_hours.toString());
      }
    })();
  }, [vehicleId]);

  const previewDueItems = async (hours: number) => {
    const rawItems = await getMaintenanceItems(vehicleId);
    const withHealth = rawItems.map((i) => computeHealth(i, hours));
    setDueItems(withHealth.filter((i) => i.percentRemaining <= 25));
  };

  const handleHoursChange = (text: string) => {
    setNewHours(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= currentHours) {
      previewDueItems(parsed);
    }
  };

  const handleSave = async () => {
    const hours = parseFloat(newHours);
    if (isNaN(hours) || hours < currentHours) {
      Alert.alert('Invalid hours', `New reading must be at least ${currentHours.toFixed(1)}`);
      return;
    }

    await updateVehicleHours(vehicleId, hours);
    await addRideLog(vehicleId, currentHours, hours, notes.trim());

    if (dueItems.length > 0) {
      Alert.alert(
        'Maintenance Due',
        `${dueItems.length} item(s) need attention:\n${dueItems.map((i) => `• ${i.name}`).join('\n')}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.currentBox}>
        <Text style={styles.currentLabel}>Current Hour Meter</Text>
        <Text style={styles.currentValue}>{currentHours.toFixed(1)} hrs</Text>
      </View>

      <Text style={styles.label}>New Hour Meter Reading</Text>
      <TextInput
        style={styles.input}
        value={newHours}
        onChangeText={handleHoursChange}
        keyboardType="decimal-pad"
        placeholder={currentHours.toString()}
        autoFocus
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Track location, conditions, etc."
        multiline
        numberOfLines={3}
      />

      {dueItems.length > 0 && (
        <View style={styles.dueSection}>
          <Text style={styles.dueTitle}>Items needing attention:</Text>
          {dueItems.map((item) => (
            <View key={item.id} style={styles.dueItem}>
              <View style={[styles.dueDot, { backgroundColor: HEALTH_COLORS[item.health] }]} />
              <Text style={styles.dueName}>{item.name}</Text>
              <Text style={[styles.dueStatus, { color: HEALTH_COLORS[item.health] }]}>
                {item.hoursRemaining <= 0
                  ? `Overdue ${Math.abs(item.hoursRemaining).toFixed(1)}h`
                  : `${item.hoursRemaining.toFixed(1)}h left`}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Ride</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  currentBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 20 },
  currentLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
  currentValue: { fontSize: 28, fontWeight: '700', color: '#2196F3' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0',
  },
  notesInput: { height: 80, textAlignVertical: 'top' },
  dueSection: { marginTop: 20, backgroundColor: '#FFF3E0', borderRadius: 8, padding: 12 },
  dueTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, color: '#E65100' },
  dueItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dueDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  dueName: { flex: 1, fontSize: 14 },
  dueStatus: { fontSize: 13, fontWeight: '500' },
  saveBtn: { backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
