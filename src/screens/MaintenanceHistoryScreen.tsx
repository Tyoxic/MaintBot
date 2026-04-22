import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { RootStackParamList } from '../models/types';
import { getMaintenanceLogs } from '../db/maintenanceLog';
import { getRideLogs } from '../db/rideLog';
import EmptyState from '../components/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'MaintenanceHistory'>;

type LogEntry = {
  id: string;
  type: 'maintenance' | 'ride';
  title: string;
  subtitle: string;
  date: string;
  rawDate: string;
};

export default function MaintenanceHistoryScreen({ route }: Props) {
  const { vehicleId } = route.params;
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const [maintenanceLogs, rideLogs] = await Promise.all([
          getMaintenanceLogs(vehicleId),
          getRideLogs(vehicleId),
        ]);

        const all: LogEntry[] = [
          ...maintenanceLogs.map((m) => ({
            id: `m-${m.id}`,
            type: 'maintenance' as const,
            title: m.item_name,
            subtitle: `Done at ${m.hours_at_service.toFixed(1)} hrs${m.notes ? ` — ${m.notes}` : ''}`,
            date: format(parseISO(m.performed_at), 'MMM d, yyyy h:mm a'),
            rawDate: m.performed_at,
          })),
          ...rideLogs.map((r) => ({
            id: `r-${r.id}`,
            type: 'ride' as const,
            title: `Ride: ${r.hours_before.toFixed(1)} → ${r.hours_after.toFixed(1)} hrs`,
            subtitle: `${(r.hours_after - r.hours_before).toFixed(1)} hrs ridden${r.notes ? ` — ${r.notes}` : ''}`,
            date: format(parseISO(r.logged_at), 'MMM d, yyyy h:mm a'),
            rawDate: r.logged_at,
          })),
        ];

        all.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
        setEntries(all);
        setLoading(false);
      })();
    }, [vehicleId])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <View style={[styles.icon, item.type === 'maintenance' ? styles.iconMaint : styles.iconRide]}>
              <Text style={styles.iconText}>{item.type === 'maintenance' ? '🔧' : '🏁'}</Text>
            </View>
            <View style={styles.entryContent}>
              <Text style={styles.entryTitle}>{item.title}</Text>
              <Text style={styles.entrySubtitle}>{item.subtitle}</Text>
              <Text style={styles.entryDate}>{item.date}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={
          entries.length === 0
            ? styles.emptyContainer
            : [styles.list, { paddingBottom: insets.bottom + 8 }]
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="📋"
              title="No history yet"
              subtitle="Log rides and complete maintenance to see your history here"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { paddingVertical: 8 },
  emptyContainer: { flex: 1 },
  entry: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginVertical: 4, borderRadius: 8, padding: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  icon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconMaint: { backgroundColor: '#E8F5E9' },
  iconRide: { backgroundColor: '#E3F2FD' },
  iconText: { fontSize: 16 },
  entryContent: { flex: 1 },
  entryTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  entrySubtitle: { fontSize: 13, color: '#666', marginBottom: 4 },
  entryDate: { fontSize: 11, color: '#aaa' },
});
