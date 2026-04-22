import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO, differenceInDays } from 'date-fns';
import { RootStackParamList, Vehicle, MaintenanceItemWithHealth } from '../models/types';
import { getVehicle } from '../db/vehicles';
import { getMaintenanceItems, createCustomItem, deleteMaintenanceItem } from '../db/maintenanceItems';
import { computeHealth, worstHealth, HEALTH_COLORS } from '../utils/colors';
import MaintenanceItemRow from '../components/MaintenanceItemRow';
import HealthIndicator from '../components/HealthIndicator';
import ConfirmModal from '../components/ConfirmModal';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [items, setItems] = useState<MaintenanceItemWithHealth[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemInterval, setNewItemInterval] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceItemWithHealth | null>(null);
  const insets = useSafeAreaInsets();

  const refresh = useCallback(async () => {
    const v = await getVehicle(vehicleId);
    setVehicle(v);
    if (v) {
      const rawItems = await getMaintenanceItems(vehicleId);
      const withHealth = rawItems.map((i) => computeHealth(i, v.current_hours));
      setItems(withHealth);
      navigation.setOptions({ title: v.name });
    }
  }, [vehicleId, navigation]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!vehicle) return null;

  const overallHealth = worstHealth(items.map((i) => i.health));

  const handleAddCustomItem = async () => {
    const itemName = newItemName.trim();
    const interval = parseFloat(newItemInterval);
    if (!itemName || !interval || interval <= 0) {
      Alert.alert('Invalid input', 'Please enter a name and a positive interval.');
      return;
    }
    await createCustomItem(vehicleId, itemName, interval);
    setNewItemName('');
    setNewItemInterval('');
    setShowAddItem(false);
    await refresh();
  };

  const handleDeleteItem = async () => {
    if (deleteTarget) {
      await deleteMaintenanceItem(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
    }
  };

  const handleLongPressItem = (item: MaintenanceItemWithHealth) => {
    Alert.alert(item.name, 'What would you like to do?', [
      { text: 'Mark Done', onPress: () => navigation.navigate('MarkDone', { vehicleId, itemId: item.id }) },
      { text: 'Delete Item', style: 'destructive', onPress: () => setDeleteTarget(item) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const regExpiryInfo = vehicle.reg_expiry ? (() => {
    const expiry = parseISO(vehicle.reg_expiry);
    const daysLeft = differenceInDays(expiry, new Date());
    const formatted = format(expiry, 'MMM d, yyyy');
    const color = daysLeft <= 0 ? '#F44336' : daysLeft <= 30 ? '#FF9800' : '#4CAF50';
    const label = daysLeft <= 0 ? 'EXPIRED' : `${daysLeft}d left`;
    return { formatted, color, label };
  })() : null;

  // Sort: red first, yellow second, green last
  const sortedItems = [...items].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return order[a.health] - order[b.health];
  });

  const attentionItems = sortedItems.filter((i) => i.health === 'red' || i.health === 'yellow');
  const goodItems = sortedItems.filter((i) => i.health === 'green');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          {vehicle.photo_uri ? (
            <Image source={{ uri: vehicle.photo_uri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.placeholderIcon}>🏍️</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <HealthIndicator status={overallHealth} size={14} />
              <Text style={styles.name}>{vehicle.name}</Text>
            </View>
            <Text style={styles.detail}>
              {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make} {vehicle.model}
            </Text>
            <Text style={styles.hours}>{vehicle.current_hours.toFixed(1)} hours</Text>
            {regExpiryInfo && (
              <View style={styles.regRow}>
                <Text style={styles.regLabel}>Reg: {regExpiryInfo.formatted}</Text>
                <View style={[styles.regBadge, { backgroundColor: regExpiryInfo.color + '20' }]}>
                  <Text style={[styles.regBadgeText, { color: regExpiryInfo.color }]}>{regExpiryInfo.label}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('LogRide', { vehicleId })}>
            <Text style={styles.actionIcon}>⏱️</Text>
            <Text style={styles.actionLabel}>Log Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MaintenanceHistory', { vehicleId })}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddEditVehicle', { vehicleId })}>
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionLabel}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ExpertView', { vehicleId })}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Expert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('VehicleNotes', { vehicleId })}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>Notes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Maintenance Items</Text>
          <TouchableOpacity onPress={() => setShowAddItem(!showAddItem)}>
            <Text style={styles.addLink}>{showAddItem ? 'Cancel' : '+ Add Custom'}</Text>
          </TouchableOpacity>
        </View>

        {showAddItem && (
          <View style={styles.addItemForm}>
            <TextInput style={styles.addItemInput} value={newItemName} onChangeText={setNewItemName} placeholder="Item name" />
            <TextInput style={[styles.addItemInput, styles.addItemIntervalInput]} value={newItemInterval} onChangeText={setNewItemInterval} placeholder="Hrs" keyboardType="decimal-pad" />
            <TouchableOpacity style={styles.addItemBtn} onPress={handleAddCustomItem}>
              <Text style={styles.addItemBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {attentionItems.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupHeader}>NEEDS ATTENTION</Text>
            <View style={styles.groupCard}>
              {attentionItems.map((item) => (
                <MaintenanceItemRow
                  key={item.id}
                  item={item}
                  onPress={() => navigation.navigate('MarkDone', { vehicleId, itemId: item.id })}
                  onLongPress={() => handleLongPressItem(item)}
                />
              ))}
            </View>
          </View>
        )}

        {goodItems.length > 0 && (
          <View style={styles.group}>
            <Text style={[styles.groupHeader, { color: '#4CAF50' }]}>GOOD</Text>
            <View style={styles.groupCard}>
              {goodItems.map((item) => (
                <MaintenanceItemRow
                  key={item.id}
                  item={item}
                  onPress={() => navigation.navigate('MarkDone', { vehicleId, itemId: item.id })}
                  onLongPress={() => handleLongPressItem(item)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Maintenance Item"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteTarget(null)}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { paddingBottom: 24 },
  header: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', marginBottom: 8 },
  photo: { width: 80, height: 80, borderRadius: 40 },
  photoPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center',
  },
  placeholderIcon: { fontSize: 32 },
  headerInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 20, fontWeight: '700' },
  detail: { fontSize: 14, color: '#666', marginBottom: 2 },
  hours: { fontSize: 16, fontWeight: '600', color: '#2196F3', marginTop: 2 },
  regRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  regLabel: { fontSize: 12, color: '#888' },
  regBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  regBadgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', paddingVertical: 12, marginBottom: 8 },
  actionBtn: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20 },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { fontSize: 12, color: '#555', fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  addLink: { fontSize: 14, color: '#2196F3', fontWeight: '600' },
  addItemForm: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
  addItemInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0',
  },
  addItemIntervalInput: { flex: 0.4 },
  addItemBtn: { backgroundColor: '#2196F3', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  addItemBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  group: { marginTop: 4 },
  groupHeader: {
    fontSize: 12, fontWeight: '700', color: '#F44336', letterSpacing: 0.5,
    paddingHorizontal: 16, marginBottom: 4,
  },
  groupCard: {
    backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 10,
    paddingVertical: 4, overflow: 'hidden',
  },
});
