import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { RootStackParamList, MaintenanceItem, MaintenanceLogEntry } from '../models/types';
import { getDatabase } from '../db/database';
import { getVehicle } from '../db/vehicles';
import { getMaintenanceItems, markItemDone } from '../db/maintenanceItems';
import {
  getMaintenanceLogs, addMaintenanceLog, updateMaintenanceLog, deleteMaintenanceLog,
} from '../db/maintenanceLog';
import { getRideLogs } from '../db/rideLog';
import CellEditModal from '../components/CellEditModal';
import { seedTE300Data } from '../utils/seedExpertData';

type Props = NativeStackScreenProps<RootStackParamList, 'ExpertView'>;

interface TableRow {
  date: string;
  displayDate: string;
  cells: Map<number, MaintenanceLogEntry>;
  notes: string;
  rideInfo: string;
}

export default function ExpertViewScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const insets = useSafeAreaInsets();
  const [columns, setColumns] = useState<MaintenanceItem[]>([]);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [currentHours, setCurrentHours] = useState(0);

  // Cell edit modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalItemName, setModalItemName] = useState('');
  const [modalHours, setModalHours] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalIsExisting, setModalIsExisting] = useState(false);
  const [modalLogEntry, setModalLogEntry] = useState<MaintenanceLogEntry | null>(null);
  const [modalItemId, setModalItemId] = useState<number>(0);
  const [modalDate, setModalDate] = useState('');

  const refresh = useCallback(async () => {
    const v = await getVehicle(vehicleId);
    if (!v) return;
    setCurrentHours(v.current_hours);
    navigation.setOptions({ title: `${v.name} – Expert` });

    const items = await getMaintenanceItems(vehicleId);
    setColumns(items);

    const logs = await getMaintenanceLogs(vehicleId);
    const rideLogs = await getRideLogs(vehicleId);

    // Collect all unique dates from both logs and ride logs
    const dateSet = new Set<string>();
    for (const log of logs) {
      dateSet.add(log.performed_at.slice(0, 10));
    }
    for (const ride of rideLogs) {
      dateSet.add(ride.logged_at.slice(0, 10));
    }

    const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

    // Build ride info lookup by date
    const rideByDate = new Map<string, string>();
    for (const ride of rideLogs) {
      const d = ride.logged_at.slice(0, 10);
      const info = `${ride.hours_before}→${ride.hours_after}`;
      const existing = rideByDate.get(d);
      rideByDate.set(d, existing ? `${existing}, ${info}` : info);
    }

    // Build rows
    const tableRows: TableRow[] = sortedDates.map((dateStr) => {
      const dayLogs = logs.filter((l) => l.performed_at.slice(0, 10) === dateStr);
      const cells = new Map<number, MaintenanceLogEntry>();
      const notesArr: string[] = [];
      for (const log of dayLogs) {
        if (log.maintenance_item_id !== null) {
          cells.set(log.maintenance_item_id, log);
        }
        if (log.notes) notesArr.push(log.notes);
      }
      return {
        date: dateStr,
        displayDate: format(parseISO(dateStr), 'MM/dd/yy'),
        cells,
        notes: notesArr.join('; '),
        rideInfo: rideByDate.get(dateStr) || '',
      };
    });

    setRows(tableRows);
  }, [vehicleId, navigation]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const openCellModal = (item: MaintenanceItem, row: TableRow | null) => {
    const existing = row ? row.cells.get(item.id) : undefined;
    setModalItemName(item.name);
    setModalItemId(item.id);
    setModalDate(row?.date || '');
    if (existing) {
      setModalIsExisting(true);
      setModalLogEntry(existing);
      setModalHours(String(existing.hours_at_service));
      setModalNotes(existing.notes || '');
    } else {
      setModalIsExisting(false);
      setModalLogEntry(null);
      setModalHours(String(currentHours));
      setModalNotes('');
    }
    setModalVisible(true);
  };

  const handleSave = async (hours: number, notes: string) => {
    if (modalIsExisting && modalLogEntry) {
      await updateMaintenanceLog(modalLogEntry.id, hours, notes);
    } else {
      await addMaintenanceLog(vehicleId, modalItemId, modalItemName, hours, notes);
    }
    await markItemDone(modalItemId, hours);
    setModalVisible(false);
    await refresh();
  };

  const handleDelete = async () => {
    if (modalLogEntry) {
      Alert.alert('Delete Entry', 'Remove this maintenance log entry?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMaintenanceLog(modalLogEntry.id);
            setModalVisible(false);
            await refresh();
          },
        },
      ]);
    }
  };

  const handleDeleteVehicleData = () => {
    Alert.alert(
      'Delete Vehicle Logs & Items',
      'This will delete all maintenance logs, ride logs, and maintenance items for THIS vehicle only. The vehicle itself will remain. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const db = await getDatabase();
            await db.runAsync('DELETE FROM maintenance_log WHERE vehicle_id = ?', vehicleId);
            await db.runAsync('DELETE FROM ride_log WHERE vehicle_id = ?', vehicleId);
            await db.runAsync('DELETE FROM maintenance_items WHERE vehicle_id = ?', vehicleId);
            Alert.alert('Done', 'Logs and items deleted for this vehicle.');
            await refresh();
          },
        },
      ]
    );
  };

  const COL_DATE = 80;
  const COL_CELL = 70;
  const COL_NOTES = 120;

  return (
    <View style={styles.container}>
      {/* Sticky header + scrollable body */}
      <View style={styles.tableWrapper}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={[styles.stickyCol, styles.headerCell, { width: COL_DATE }]}>
            <Text style={styles.headerText}>Date</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollArea}>
            <View>
              <View style={styles.headerInner}>
                {columns.map((col) => (
                  <View key={col.id} style={[styles.headerCell, { width: COL_CELL }]}>
                    <Text style={styles.headerText} numberOfLines={2}>{col.name}</Text>
                  </View>
                ))}
                <View style={[styles.headerCell, { width: COL_NOTES }]}>
                  <Text style={styles.headerText}>Notes</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Body rows */}
        <ScrollView style={styles.bodyScroll}>
          {rows.map((row) => (
            <View key={row.date} style={styles.dataRow}>
              <View style={[styles.stickyCol, styles.dateCell, { width: COL_DATE }]}>
                <Text style={styles.dateText}>{row.displayDate}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollArea}>
                <View style={styles.rowInner}>
                  {columns.map((col) => {
                    const entry = row.cells.get(col.id);
                    return (
                      <TouchableOpacity
                        key={col.id}
                        style={[styles.cell, { width: COL_CELL }, entry && styles.filledCell]}
                        onPress={() => openCellModal(col, row)}
                        activeOpacity={0.6}
                      >
                        <Text style={[styles.cellText, entry && styles.filledCellText]}>
                          {entry ? entry.hours_at_service.toFixed(1) : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={[styles.cell, { width: COL_NOTES }]}>
                    <Text style={styles.notesCellText} numberOfLines={1}>{row.notes}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          ))}

          {rows.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No maintenance history yet.</Text>
              <Text style={styles.emptySubtext}>Tap a column header to add an entry.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Add new entry button */}
      <View style={[styles.addRowBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.addRowHint}>Tap any column header to add a new entry</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#F44336', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
              onPress={handleDeleteVehicleData}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Delete All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#FF9800', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}
              onPress={async () => {
                const msg = await seedTE300Data();
                Alert.alert('Seed Data', msg);
                await refresh();
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Import Sheet</Text>
            </TouchableOpacity>
          </View>
        </View>
        {columns.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddScroll}>
            {columns.map((col) => (
              <TouchableOpacity
                key={col.id}
                style={styles.quickAddBtn}
                onPress={() => openCellModal(col, null)}
              >
                <Text style={styles.quickAddText}>+ {col.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <CellEditModal
        visible={modalVisible}
        itemName={modalItemName}
        initialHours={modalHours}
        initialNotes={modalNotes}
        isExisting={modalIsExisting}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tableWrapper: { flex: 1 },
  headerRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#e0e0e0' },
  stickyCol: { backgroundColor: '#fff', zIndex: 1, borderRightWidth: 1, borderRightColor: '#e0e0e0' },
  scrollArea: { flex: 1 },
  headerCell: { paddingHorizontal: 4, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  headerText: { fontSize: 10, fontWeight: '700', color: '#555', textAlign: 'center' },
  headerInner: { flexDirection: 'row' },
  bodyScroll: { flex: 1 },
  dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  dateCell: { paddingHorizontal: 6, paddingVertical: 10, justifyContent: 'center' },
  dateText: { fontSize: 11, fontWeight: '600', color: '#333' },
  rowInner: { flexDirection: 'row' },
  cell: {
    paddingHorizontal: 4, paddingVertical: 10,
    justifyContent: 'center', alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#eee',
  },
  filledCell: { backgroundColor: '#E3F2FD' },
  cellText: { fontSize: 12, color: '#999' },
  filledCellText: { color: '#1565C0', fontWeight: '600' },
  rideCellText: { fontSize: 10, color: '#666' },
  notesCellText: { fontSize: 10, color: '#888' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#bbb', marginTop: 4 },
  addRowBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingVertical: 8, paddingHorizontal: 12 },
  addRowHint: { fontSize: 11, color: '#999', marginBottom: 6 },
  quickAddScroll: { flexGrow: 0 },
  quickAddBtn: {
    backgroundColor: '#E3F2FD', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
    marginRight: 8,
  },
  quickAddText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
});
