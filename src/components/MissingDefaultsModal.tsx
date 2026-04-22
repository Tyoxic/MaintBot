import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { DefaultItemSuggestion } from '../db/maintenanceItems';

interface Props {
  visible: boolean;
  suggestions: DefaultItemSuggestion[];
  onApply: (toAdd: string[], toDismiss: string[]) => void;
  onCancel: () => void;
}

export default function MissingDefaultsModal({
  visible,
  suggestions,
  onApply,
  onCancel,
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      // Default: all checked
      setChecked(new Set(suggestions.map((s) => s.name)));
    }
  }, [visible, suggestions]);

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleApply = () => {
    const toAdd: string[] = [];
    const toDismiss: string[] = [];
    for (const s of suggestions) {
      if (checked.has(s.name)) {
        toAdd.push(s.name);
      } else {
        toDismiss.push(s.name);
      }
    }
    onApply(toAdd, toDismiss);
  };

  const checkedCount = checked.size;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Recommended Items</Text>
          <Text style={styles.message}>
            These maintenance items aren't in your list yet. Pick which ones to add.
            Unchecked items won't be suggested again for this vehicle.
          </Text>
          <ScrollView style={styles.list}>
            {suggestions.map((s) => {
              const isChecked = checked.has(s.name);
              return (
                <TouchableOpacity
                  key={s.name}
                  style={styles.row}
                  onPress={() => toggle(s.name)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{s.name}</Text>
                    <Text style={styles.rowInterval}>
                      {s.interval_hours > 0 ? `Every ${s.interval_hours}h` : 'Track only'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>
                {checkedCount === 0
                  ? 'Dismiss All'
                  : `Add ${checkedCount}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  list: { marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
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
  rowText: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowInterval: { fontSize: 12, color: '#888', marginTop: 2 },
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
