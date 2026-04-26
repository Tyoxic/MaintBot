import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface Props {
  visible: boolean;
  initialName: string;
  initialIntervalHours: number;
  initialIntervalMiles: number;
  onSave: (name: string, intervalHours: number, intervalMiles: number) => void;
  onCancel: () => void;
}

export default function EditItemModal({
  visible,
  initialName,
  initialIntervalHours,
  initialIntervalMiles,
  onSave,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialName);
  const [hours, setHours] = useState(String(initialIntervalHours));
  const [miles, setMiles] = useState(String(initialIntervalMiles));

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setHours(String(initialIntervalHours));
      setMiles(String(initialIntervalMiles));
    }
  }, [visible, initialName, initialIntervalHours, initialIntervalMiles]);

  const trimmedName = name.trim();
  const safe = (raw: string): number => {
    const p = parseFloat(raw);
    if (!isFinite(p) || p < 0) return 0;
    return Math.min(p, 999999);
  };
  const safeHours = safe(hours);
  const safeMiles = safe(miles);
  const canSave = trimmedName.length > 0;
  const trackOnly = safeHours === 0 && safeMiles === 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <View style={styles.dialog}>
          <Text style={styles.title}>Edit Maintenance Item</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Item name"
            autoCapitalize="words"
            selectTextOnFocus
          />

          <Text style={styles.label}>Interval — Hours</Text>
          <View style={styles.intervalRow}>
            <TextInput
              style={styles.intervalInput}
              value={hours}
              onChangeText={setHours}
              keyboardType="numeric"
              selectTextOnFocus
              maxLength={5}
              placeholder="0"
            />
            <Text style={styles.intervalHint}>
              {safeHours === 0 ? 'Off' : `Every ${safeHours}h`}
            </Text>
          </View>

          <Text style={styles.label}>Interval — Miles</Text>
          <View style={styles.intervalRow}>
            <TextInput
              style={styles.intervalInput}
              value={miles}
              onChangeText={setMiles}
              keyboardType="numeric"
              selectTextOnFocus
              maxLength={6}
              placeholder="0"
            />
            <Text style={styles.intervalHint}>
              {safeMiles === 0 ? 'Off' : `Every ${safeMiles} mi`}
            </Text>
          </View>

          <Text style={styles.helperLine}>
            {trackOnly
              ? 'Both off = track only (no interval reminder)'
              : 'Health turns yellow/red when whichever runs out first'}
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveDisabled]}
              onPress={() => canSave && onSave(trimmedName, safeHours, safeMiles)}
              disabled={!canSave}
            >
              <Text style={styles.saveText}>Save</Text>
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
  },
  title: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  helperLine: { fontSize: 11, color: '#999', marginTop: 12, fontStyle: 'italic' },
  intervalInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
    textAlign: 'center',
  },
  intervalHint: { flex: 1, fontSize: 12, color: '#888', fontStyle: 'italic' },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
