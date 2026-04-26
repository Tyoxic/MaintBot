import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaintenanceItemWithHealth } from '../models/types';
import { HEALTH_COLORS } from '../utils/colors';

interface Props {
  item: MaintenanceItemWithHealth;
  onPress: () => void;
  onLongPress?: () => void;
}

function formatRemaining(remaining: number, unit: 'hrs' | 'mi'): string {
  if (remaining <= 0) return `OVERDUE by ${Math.abs(remaining).toFixed(unit === 'mi' ? 0 : 1)} ${unit}`;
  return `${remaining.toFixed(unit === 'mi' ? 0 : 1)} ${unit} left`;
}

export default function MaintenanceItemRow({ item, onPress, onLongPress }: Props) {
  const hasHours = item.interval_hours > 0;
  const hasMiles = item.interval_miles > 0;
  const trackOnly = !hasHours && !hasMiles;
  const color = HEALTH_COLORS[item.health];

  let primaryText: string;
  let secondaryText: string | null = null;

  if (trackOnly) {
    const lastHours = item.last_done_hours;
    const lastMiles = item.last_done_miles ?? 0;
    if (lastHours > 0 && lastMiles > 0) {
      primaryText = `Done @ ${lastHours.toFixed(1)} hrs / ${lastMiles.toLocaleString()} mi`;
    } else if (lastHours > 0) {
      primaryText = `Done @ ${lastHours.toFixed(1)} hrs`;
    } else if (lastMiles > 0) {
      primaryText = `Done @ ${lastMiles.toLocaleString()} mi`;
    } else {
      primaryText = 'Not yet logged';
    }
  } else {
    // Show whichever dimension is driving the status, with secondary if both tracked
    if (item.drivenBy === 'hours') {
      primaryText = formatRemaining(item.hoursRemaining, 'hrs');
      if (hasMiles) secondaryText = formatRemaining(item.milesRemaining, 'mi');
    } else {
      primaryText = formatRemaining(item.milesRemaining, 'mi');
      if (hasHours) secondaryText = formatRemaining(item.hoursRemaining, 'hrs');
    }
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
        <View style={styles.statusWrap}>
          <Text style={[styles.primaryText, { color: trackOnly ? '#999' : color }]}>{primaryText}</Text>
          {secondaryText ? (
            <Text style={styles.secondaryText}>{secondaryText}</Text>
          ) : null}
        </View>
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
  statusWrap: {
    alignItems: 'flex-end',
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryText: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
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
