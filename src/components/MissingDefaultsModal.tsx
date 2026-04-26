import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DefaultItemSuggestion } from '../db/maintenanceItems';

export interface DefaultItemSelection {
  name: string;
  intervalHours: number;
  intervalMiles: number;
  sortOrder: number;
}

interface Props {
  visible: boolean;
  suggestions: DefaultItemSuggestion[];
  onApply: (toAdd: DefaultItemSelection[], toDismiss: string[]) => void;
  onCancel: () => void;
}

export default function MissingDefaultsModal({
  visible,
  suggestions,
  onApply,
  onCancel,
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hoursIntervals, setHoursIntervals] = useState<Record<string, string>>({});
  const [milesIntervals, setMilesIntervals] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setChecked(new Set(suggestions.map((s) => s.name)));
      const initialHours: Record<string, string> = {};
      const initialMiles: Record<string, string> = {};
      for (const s of suggestions) {
        initialHours[s.name] = String(s.interval_hours);
        initialMiles[s.name] = String(s.interval_miles);
      }
      setHoursIntervals(initialHours);
      setMilesIntervals(initialMiles);
    }
  }, [visible, suggestions]);

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const setHours = (name: string, value: string) => {
    setHoursIntervals((prev) => ({ ...prev, [name]: value }));
  };
  const setMiles = (name: string, value: string) => {
    setMilesIntervals((prev) => ({ ...prev, [name]: value }));
  };

  const safeNum = (raw: string): number => {
    const parsed = parseFloat(raw);
    if (!isFinite(parsed) || parsed < 0) return 0;
    return Math.min(parsed, 999999);
  };

  const handleApply = () => {
    const toAdd: DefaultItemSelection[] = [];
    const toDismiss: string[] = [];
    for (const s of suggestions) {
      if (checked.has(s.name)) {
        toAdd.push({
          name: s.name,
          intervalHours: safeNum(hoursIntervals[s.name] ?? String(s.interval_hours)),
          intervalMiles: safeNum(milesIntervals[s.name] ?? String(s.interval_miles)),
          sortOrder: s.sort_order,
        });
      } else {
        toDismiss.push(s.name);
      }
    }
    onApply(toAdd, toDismiss);
  };

  const checkedCount = checked.size;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>Recommended Items</Text>
          <Text style={styles.message}>
            These maintenance items aren't in your list yet. Pick which to add
            and set intervals. Unchecked items won't be suggested again for this vehicle.
          </Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {suggestions.map((s) => {
              const isChecked = checked.has(s.name);
              const hVal = hoursIntervals[s.name] ?? String(s.interval_hours);
              const mVal = milesIntervals[s.name] ?? String(s.interval_miles);
              return (
                <View key={s.name} style={styles.row}>
                  <TouchableOpacity
                    style={styles.leftWrap}
                    onPress={() => toggle(s.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.rowName} numberOfLines={1}>{s.name}</Text>
                  </TouchableOpacity>
                  <View style={styles.rightStack}>
                    <View style={styles.rightWrap}>
                      <TextInput
                        style={[styles.intervalInput, !isChecked && styles.intervalDisabled]}
                        value={hVal}
                        onChangeText={(v) => setHours(s.name, v)}
                        keyboardType="numeric"
                        editable={isChecked}
                        selectTextOnFocus
                        maxLength={5}
                      />
                      <Text style={styles.intervalUnit}>h</Text>
                    </View>
                    <View style={styles.rightWrap}>
                      <TextInput
                        style={[styles.intervalInput, !isChecked && styles.intervalDisabled]}
                        value={mVal}
                        onChangeText={(v) => setMiles(s.name, v)}
                        keyboardType="numeric"
                        editable={isChecked}
                        selectTextOnFocus
                        maxLength={6}
                      />
                      <Text style={styles.intervalUnit}>mi</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <Text style={styles.hint}>
            0 in both fields = track only. Set either or both.
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>
                {checkedCount === 0 ? 'Dismiss All' : `Add ${checkedCount}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    width: '88%',
    maxHeight: '80%',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#222' },
  message: { fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 18 },
  list: { marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  leftWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#bbb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#222' },
  rightStack: { flexDirection: 'column', gap: 4 },
  rightWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  intervalInput: {
    width: 54,
    height: 34,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#fafafa',
    color: '#222',
  },
  intervalDisabled: { color: '#ccc', backgroundColor: '#f5f5f5' },
  intervalUnit: { fontSize: 12, color: '#666', minWidth: 32 },
  hint: { fontSize: 11, color: '#999', marginBottom: 12, fontStyle: 'italic' },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  applyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  applyText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
