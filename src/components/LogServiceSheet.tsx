import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { MaintenanceItem } from '../models/types';

export interface LogServiceDraft {
  itemId: number;
  itemName: string;
  hoursAtService: number;
  milesAtService: number | null;
  performedAt: string; // YYYY-MM-DDTHH:mm:ss format
  notes: string;
}

interface Props {
  visible: boolean;
  title: string;
  items: MaintenanceItem[];
  currentHours: number;
  currentMiles: number;
  initial?: Partial<LogServiceDraft>;
  canDelete?: boolean;
  onSave: (draft: LogServiceDraft) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function formatContext(item: MaintenanceItem, currentHours: number): string {
  if (!item.last_done_hours || item.last_done_hours === 0) return 'Never logged';
  const elapsed = Math.max(0, currentHours - item.last_done_hours);
  if (elapsed === 0) return 'Done at current hours';
  return `Last done ${elapsed.toFixed(1)}h ago`;
}

export default function LogServiceSheet({
  visible,
  title,
  items,
  currentHours,
  currentMiles,
  initial,
  canDelete,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [hours, setHours] = useState('');
  const [miles, setMiles] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedItemId(initial?.itemId ?? null);
    setHours(
      initial?.hoursAtService !== undefined
        ? String(initial.hoursAtService)
        : String(currentHours)
    );
    setMiles(
      initial?.milesAtService !== undefined && initial?.milesAtService !== null
        ? String(initial.milesAtService)
        : currentMiles > 0
        ? String(currentMiles)
        : ''
    );
    setNotes(initial?.notes ?? '');
    setDate(initial?.performedAt ? parseISO(initial.performedAt) : new Date());
    setShowDatePicker(false);
  }, [visible, initial, currentHours, currentMiles]);

  const selectedItem = items.find((i) => i.id === selectedItemId) ?? null;
  const parsedHours = parseFloat(hours);
  const milesTrimmed = miles.trim();
  const parsedMiles = milesTrimmed === '' ? null : parseFloat(milesTrimmed);
  const milesValid =
    parsedMiles === null ||
    (isFinite(parsedMiles) && parsedMiles >= 0 && parsedMiles <= 999999);
  const canSave =
    selectedItem !== null &&
    isFinite(parsedHours) &&
    parsedHours >= 0 &&
    parsedHours <= 999999 &&
    milesValid;

  const handleSave = () => {
    if (!canSave || !selectedItem) return;
    onSave({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      hoursAtService: parsedHours,
      milesAtService: parsedMiles,
      performedAt: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
      notes: notes.trim(),
    });
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <TouchableOpacity onPress={onCancel} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave}
                hitSlop={8}
              >
                <Text style={[styles.saveText, !canSave && styles.saveDisabled]}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Which item?</Text>
              <View style={styles.itemCard}>
                {items.length === 0 ? (
                  <Text style={styles.emptyItems}>
                    No maintenance items yet. Add one from Vehicle Detail first.
                  </Text>
                ) : (
                  items.map((item) => {
                    const selected = selectedItemId === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.itemRow, selected && styles.itemRowSelected]}
                        onPress={() => setSelectedItemId(item.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemTextWrap}>
                          <Text
                            style={[styles.itemName, selected && styles.itemNameSelected]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.itemContext}>
                            {formatContext(item, currentHours)}
                            {item.interval_hours > 0 ? ` · Every ${item.interval_hours}h` : ''}
                          </Text>
                        </View>
                        {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <Text style={styles.label}>When?</Text>
              <TouchableOpacity
                style={styles.dateChip}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateChipText}>{format(date, 'EEE, MMM d, yyyy')}</Text>
                <Text style={styles.dateChipHint}>Tap to change</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}

              <Text style={styles.label}>Hours at service</Text>
              <TextInput
                style={styles.input}
                value={hours}
                onChangeText={setHours}
                keyboardType="decimal-pad"
                placeholder={currentHours.toString()}
                selectTextOnFocus
              />

              <Text style={styles.label}>Miles at service (optional)</Text>
              <TextInput
                style={styles.input}
                value={miles}
                onChangeText={setMiles}
                keyboardType="decimal-pad"
                placeholder={currentMiles > 0 ? currentMiles.toString() : 'leave blank if not tracking'}
                selectTextOnFocus
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Parts used, observations, receipts..."
                multiline
                textAlignVertical="top"
                maxLength={500}
              />

              {canDelete && onDelete ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    Alert.alert(
                      'Delete Service Entry',
                      'Remove this service log entry? This cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: onDelete },
                      ]
                    );
                  }}
                >
                  <Text style={styles.deleteText}>Delete entry</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetWrapper: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#222' },
  cancelText: { fontSize: 15, color: '#666' },
  saveText: { fontSize: 15, color: '#2196F3', fontWeight: '700' },
  saveDisabled: { color: '#bbb' },
  body: { flexGrow: 0 },
  bodyContent: { padding: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 260,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  itemRowSelected: { backgroundColor: '#E3F2FD' },
  itemTextWrap: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#222' },
  itemNameSelected: { color: '#0D47A1' },
  itemContext: { fontSize: 12, color: '#888', marginTop: 2 },
  checkmark: { fontSize: 18, color: '#2196F3', fontWeight: '700' },
  emptyItems: { fontSize: 13, color: '#888', padding: 16, textAlign: 'center' },
  dateChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateChipText: { fontSize: 15, fontWeight: '600', color: '#222' },
  dateChipHint: { fontSize: 11, color: '#888', marginTop: 2 },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#222',
  },
  notesInput: { minHeight: 72 },
  deleteBtn: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
  },
  deleteText: { color: '#C62828', fontSize: 15, fontWeight: '600' },
});
