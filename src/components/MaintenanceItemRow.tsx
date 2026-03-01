import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaintenanceItemWithHealth } from '../models/types';
import { HEALTH_COLORS } from '../utils/colors';
import HealthIndicator from './HealthIndicator';

interface Props {
  item: MaintenanceItemWithHealth;
  onPress: () => void;
}

export default function MaintenanceItemRow({ item, onPress }: Props) {
  const hoursText = item.hoursRemaining <= 0
    ? `OVERDUE by ${Math.abs(item.hoursRemaining).toFixed(1)} hrs`
    : `${item.hoursRemaining.toFixed(1)} hrs remaining`;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.colorBar, { backgroundColor: HEALTH_COLORS[item.health] }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <HealthIndicator status={item.health} />
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <Text style={[styles.status, { color: HEALTH_COLORS[item.health] }]}>
          {hoursText}
        </Text>
        <Text style={styles.interval}>Every {item.interval_hours} hrs</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginHorizontal: 16, marginVertical: 4, borderRadius: 8,
    overflow: 'hidden', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  colorBar: { width: 4 },
  content: { flex: 1, padding: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600' },
  status: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  interval: { fontSize: 12, color: '#999' },
});
