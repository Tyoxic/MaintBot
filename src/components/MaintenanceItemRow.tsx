import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaintenanceItemWithHealth } from '../models/types';
import { HEALTH_COLORS } from '../utils/colors';

interface Props {
  item: MaintenanceItemWithHealth;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function MaintenanceItemRow({ item, onPress, onLongPress }: Props) {
  const trackOnly = item.interval_hours <= 0;
  const color = HEALTH_COLORS[item.health];

  let hoursText: string;
  if (trackOnly) {
    hoursText = item.last_done_hours > 0 ? `Done @ ${item.last_done_hours.toFixed(1)} hrs` : 'Not yet logged';
  } else if (item.hoursRemaining <= 0) {
    hoursText = `OVERDUE by ${Math.abs(item.hoursRemaining).toFixed(1)} hrs`;
  } else {
    hoursText = `${item.hoursRemaining.toFixed(1)} hrs left`;
  }

  const fillPercent = Math.max(0, Math.min(100, item.percentRemaining));

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <View style={styles.topLine}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.hoursText, { color: trackOnly ? '#999' : color }]}>{hoursText}</Text>
      </View>
      {!trackOnly && (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${fillPercent}%`, backgroundColor: color }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  hoursText: {
    fontSize: 13,
    fontWeight: '600',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e8e8e8',
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
