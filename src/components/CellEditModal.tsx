import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';

interface Props {
  visible: boolean;
  itemName: string;
  initialHours: string;
  initialNotes: string;
  isExisting: boolean;
  onSave: (hours: number, notes: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function CellEditModal({
  visible,
  itemName,
  initialHours,
  initialNotes,
  isExisting,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const [hours, setHours] = useState(initialHours);
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setHours(initialHours);
    setNotes(initialNotes);
  }, [initialHours, initialNotes]);

  const handleSave = () => {
    const h = parseFloat(hours);
    if (isNaN(h) || h < 0) return;
    onSave(h, notes.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>{isExisting ? 'Edit Entry' : 'Add Entry'}</Text>
          <Text style={styles.itemName}>{itemName}</Text>

          <Text style={styles.label}>Hours at service</Text>
          <TextInput
            style={styles.input}
            value={hours}
            onChangeText={setHours}
            keyboardType="decimal-pad"
            placeholder="0.0"
            autoFocus
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            multiline
          />

          <View style={styles.buttons}>
            {isExisting && (
              <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialog: { backgroundColor: '#fff', borderRadius: 12, padding: 24, marginHorizontal: 32, width: '85%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  itemName: { fontSize: 14, color: '#2196F3', fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 12,
  },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  deleteBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  deleteText: { fontSize: 15, color: '#F44336', fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#2196F3', borderRadius: 8 },
  saveText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
