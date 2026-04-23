import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  parseISO,
} from 'date-fns';
import { RootStackParamList, MaintenanceItem, MaintenanceLogEntry } from '../models/types';
import { getVehicle } from '../db/vehicles';
import { getMaintenanceItems, recomputeLastDoneHours } from '../db/maintenanceItems';
import {
  getMaintenanceLogs,
  addMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
} from '../db/maintenanceLog';
import LogServiceSheet, { LogServiceDraft } from '../components/LogServiceSheet';
import EmptyState from '../components/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceLog'>;

interface Section {
  title: string;
  order: number;
  data: MaintenanceLogEntry[];
}

function bucketFor(dateISO: string, now: Date): { title: string; order: number } {
  const days = differenceInCalendarDays(now, parseISO(dateISO));
  if (days <= 0) return { title: 'Today', order: 0 };
  if (days === 1) return { title: 'Yesterday', order: 1 };
  if (days <= 7) return { title: 'This week', order: 2 };
  if (days <= 30) return { title: 'This month', order: 3 };
  if (days <= 365) return { title: 'Earlier this year', order: 4 };
  return { title: 'Older', order: 5 };
}

function relativeDate(dateISO: string): string {
  const d = parseISO(dateISO);
  const days = differenceInCalendarDays(new Date(), d);
  if (days <= 0) return formatDistanceToNowStrict(d, { addSuffix: true });
  if (days === 1) return 'Yesterday';
  if (days <= 7) return format(d, 'EEE');
  return format(d, 'MMM d');
}

export default function ServiceLogScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [logs, setLogs] = useState<MaintenanceLogEntry[]>([]);
  const [currentHours, setCurrentHours] = useState(0);
  const [filterItemId, setFilterItemId] = useState<number | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLogEntry | null>(null);

  const refresh = useCallback(async () => {
    const v = await getVehicle(vehicleId);
    if (!v) return;
    setCurrentHours(v.current_hours);
    const [rawItems, rawLogs] = await Promise.all([
      getMaintenanceItems(vehicleId),
      getMaintenanceLogs(vehicleId),
    ]);
    setItems(rawItems);
    setLogs(rawLogs);
  }, [vehicleId]);

  useLayoutEffect(() => {
    (async () => {
      const v = await getVehicle(vehicleId);
      if (v) navigation.setOptions({ title: `${v.name} — Service Log` });
    })();
  }, [navigation, vehicleId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filteredLogs = useMemo(() => {
    if (filterItemId === null) return logs;
    return logs.filter((l) => l.maintenance_item_id === filterItemId);
  }, [logs, filterItemId]);

  const sections = useMemo<Section[]>(() => {
    const now = new Date();
    const map = new Map<string, Section>();
    for (const log of filteredLogs) {
      const bucket = bucketFor(log.performed_at, now);
      let sec = map.get(bucket.title);
      if (!sec) {
        sec = { title: bucket.title, order: bucket.order, data: [] };
        map.set(bucket.title, sec);
      }
      sec.data.push(log);
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [filteredLogs]);

  const openAddSheet = () => {
    setEditingLog(null);
    setSheetVisible(true);
  };

  const openEditSheet = (log: MaintenanceLogEntry) => {
    setEditingLog(log);
    setSheetVisible(true);
  };

  const handleSave = useCallback(async (draft: LogServiceDraft) => {
    setSheetVisible(false);
    if (editingLog) {
      await updateMaintenanceLog(editingLog.id, draft.hoursAtService, draft.notes);
    } else {
      await addMaintenanceLog(
        vehicleId,
        draft.itemId,
        draft.itemName,
        draft.hoursAtService,
        draft.notes
      );
    }
    // Recompute from the log table so historical edits and adds don't
    // incorrectly overwrite last_done_hours with a lower value.
    await recomputeLastDoneHours(draft.itemId);
    setEditingLog(null);
    await refresh();
  }, [editingLog, vehicleId, refresh]);

  const handleDelete = useCallback(async () => {
    if (!editingLog) return;
    setSheetVisible(false);
    const itemId = editingLog.maintenance_item_id;
    await deleteMaintenanceLog(editingLog.id);
    if (itemId !== null) {
      await recomputeLastDoneHours(itemId);
    }
    setEditingLog(null);
    await refresh();
  }, [editingLog, refresh]);

  const handleCardLongPress = (log: MaintenanceLogEntry) => {
    Alert.alert(log.item_name, `${log.hours_at_service.toFixed(1)} hrs · ${format(parseISO(log.performed_at), 'MMM d, yyyy')}`, [
      { text: 'Edit', onPress: () => openEditSheet(log) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Service Entry', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                const itemId = log.maintenance_item_id;
                await deleteMaintenanceLog(log.id);
                if (itemId !== null) {
                  await recomputeLastDoneHours(itemId);
                }
                await refresh();
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const initialDraft = editingLog
    ? {
        itemId: editingLog.maintenance_item_id ?? undefined,
        itemName: editingLog.item_name,
        hoursAtService: editingLog.hours_at_service,
        performedAt: editingLog.performed_at,
        notes: editingLog.notes,
      }
    : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.summaryBar}>
        <Text style={styles.summaryHours}>{currentHours.toFixed(1)} hrs</Text>
        <Text style={styles.summaryLabel}>
          {logs.length} service {logs.length === 1 ? 'entry' : 'entries'}
          {filterItemId !== null ? ' (filtered)' : ''}
        </Text>
      </View>

      <View style={styles.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipBarContent}
        >
          <TouchableOpacity
            style={[styles.chip, filterItemId === null && styles.chipActive]}
            onPress={() => setFilterItemId(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, filterItemId === null && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {items.map((item) => {
            const active = filterItemId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilterItemId(active ? null : item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {filteredLogs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="🔧"
            title={
              filterItemId !== null
                ? 'No entries for this item'
                : 'No service logged yet'
            }
            subtitle={
              filterItemId !== null
                ? 'Tap the + button to add one, or change the filter.'
                : 'Tap the + button to log your first service.'
            }
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(log) => `m-${log.id}`}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 96 }]}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
          )}
          renderItem={({ item: log }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openEditSheet(log)}
              onLongPress={() => handleCardLongPress(log)}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>🔧</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{log.item_name}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  Done at {log.hours_at_service.toFixed(1)} hrs
                </Text>
                {log.notes ? (
                  <Text style={styles.cardNotes} numberOfLines={2}>{log.notes}</Text>
                ) : null}
              </View>
              <Text style={styles.cardDate}>{relativeDate(log.performed_at)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={openAddSheet}
        disabled={items.length === 0}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <LogServiceSheet
        visible={sheetVisible}
        title={editingLog ? 'Edit Service' : 'Log Service'}
        items={items}
        currentHours={currentHours}
        initial={initialDraft}
        canDelete={!!editingLog}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={() => {
          setSheetVisible(false);
          setEditingLog(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  summaryHours: { fontSize: 20, fontWeight: '700', color: '#2196F3' },
  summaryLabel: { fontSize: 12, color: '#888' },
  chipBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chipBarContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: '#2196F3' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  listContent: { paddingTop: 8 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIcon: { fontSize: 18 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  cardSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  cardNotes: { fontSize: 12, color: '#888', marginTop: 4, lineHeight: 16 },
  cardDate: { fontSize: 11, color: '#999', marginLeft: 8, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },
});
