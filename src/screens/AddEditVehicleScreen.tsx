import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image, Platform, KeyboardAvoidingView,
  type NativeSyntheticEvent, type TextInputFocusEventData,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { RootStackParamList, VehicleType } from '../models/types';
import { createVehicle, getVehicle, updateVehicle, deleteVehicle } from '../db/vehicles';
import { seedDefaultItems } from '../db/maintenanceItems';
import { VEHICLE_TYPES } from '../utils/constants';
import { scheduleRegExpiryReminders, cancelRegReminders, requestNotificationPermissions } from '../utils/notifications';
import ConfirmModal from '../components/ConfirmModal';
import { persistVehiclePhoto, deleteVehiclePhoto } from '../utils/imageStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditVehicle'>;

export default function AddEditVehicleScreen({ navigation, route }: Props) {
  const vehicleId = route.params?.vehicleId;
  const isEdit = !!vehicleId;

  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<VehicleType>('dirtbike');
  const [vin, setVin] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [currentHours, setCurrentHours] = useState('0');
  const [currentMiles, setCurrentMiles] = useState('0');
  const [regExpiry, setRegExpiry] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  const trackLayout = (field: string) => (event: any) => {
    fieldPositions.current[field] = event.nativeEvent.layout.y;
  };

  const scrollToField = (field: string) => () => {
    setTimeout(() => {
      const y = fieldPositions.current[field];
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
      }
    }, 250);
  };

  useEffect(() => {
    if (isEdit && vehicleId) {
      (async () => {
        const v = await getVehicle(vehicleId);
        if (v) {
          setName(v.name);
          setYear(v.year ? v.year.toString() : '');
          setMake(v.make);
          setModel(v.model);
          setType(v.type);
          setVin(v.vin);
          setPhotoUri(v.photo_uri);
          setCurrentHours(v.current_hours.toString());
          setCurrentMiles((v.current_miles ?? 0).toString());
          setRegExpiry(v.reg_expiry ?? '');
        }
      })();
    }
  }, [vehicleId, isEdit]);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Edit Vehicle' : 'Add Vehicle',
      headerRight: isEdit
        ? () => (
            <TouchableOpacity onPress={() => setShowDelete(true)}>
              <Text style={{ color: '#F44336', fontSize: 15, fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, isEdit]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      try {
        const persistedUri = persistVehiclePhoto(result.assets[0].uri);
        if (photoUri) {
          deleteVehiclePhoto(photoUri);
        }
        setPhotoUri(persistedUri);
      } catch {
        Alert.alert('Error', 'Failed to save photo. Try again.');
      }
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter a name for this vehicle.');
      return;
    }

    const trimmedExpiry = regExpiry.trim();
    if (trimmedExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedExpiry)) {
      Alert.alert('Invalid date', 'Registration expiry must be YYYY-MM-DD format.');
      return;
    }

    const parsedHours = parseFloat(currentHours);
    const parsedMiles = parseFloat(currentMiles);
    const safeMiles =
      !isFinite(parsedMiles) || parsedMiles < 0 ? 0 : Math.min(parsedMiles, 999999);
    const safeHours =
      !isFinite(parsedHours) || parsedHours < 0 ? 0 : Math.min(parsedHours, 999999);

    const data = {
      name: trimmedName,
      year: year ? parseInt(year, 10) : null,
      make: make.trim(),
      model: model.trim(),
      type,
      vin: vin.trim(),
      photo_uri: photoUri,
      current_hours: safeHours,
      current_miles: safeMiles,
      reg_expiry: trimmedExpiry || null,
    };

    let savedId: number;
    if (isEdit && vehicleId) {
      await updateVehicle(vehicleId, data);
      savedId = vehicleId;
    } else {
      savedId = await createVehicle(data);
      await seedDefaultItems(savedId);
    }

    // Schedule registration reminders if expiry is set
    if (trimmedExpiry) {
      const hasPerms = await requestNotificationPermissions();
      if (hasPerms) {
        await scheduleRegExpiryReminders(savedId, trimmedName, trimmedExpiry);
      }
    } else if (isEdit && vehicleId) {
      await cancelRegReminders(vehicleId);
    }

    navigation.goBack();
  };

  const handleDelete = async () => {
    if (vehicleId) {
      await cancelRegReminders(vehicleId);
      await deleteVehicle(vehicleId);
      if (photoUri) {
        deleteVehiclePhoto(photoUri);
      }
      setShowDelete(false);
      navigation.popTo('Garage');
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setRegExpiry(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const datePickerValue = regExpiry ? parseISO(regExpiry) : new Date();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.photoArea} onPress={pickImage}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View onLayout={trackLayout('name')}>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. YZ250F" onFocus={scrollToField('name')} selectTextOnFocus />
        </View>

        <View style={styles.row} onLayout={trackLayout('yearMake')}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Year</Text>
            <TextInput style={styles.input} value={year} onChangeText={setYear} placeholder="2024" keyboardType="number-pad" maxLength={4} onFocus={scrollToField('yearMake')} selectTextOnFocus />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Make</Text>
            <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="Yamaha" onFocus={scrollToField('yearMake')} selectTextOnFocus />
          </View>
        </View>

        <View onLayout={trackLayout('model')}>
          <Text style={styles.label}>Model</Text>
          <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="YZ250F" onFocus={scrollToField('model')} selectTextOnFocus />
        </View>

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {VEHICLE_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeChip, type === t.value && styles.typeChipActive]}
              onPress={() => setType(t.value as VehicleType)}
            >
              <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View onLayout={trackLayout('vin')}>
          <Text style={styles.label}>VIN</Text>
          <TextInput style={styles.input} value={vin} onChangeText={setVin} placeholder="Optional" autoCapitalize="characters" onFocus={scrollToField('vin')} selectTextOnFocus />
        </View>

        <View onLayout={trackLayout('hours')}>
          <Text style={styles.label}>Current Hours</Text>
          <TextInput style={styles.input} value={currentHours} onChangeText={setCurrentHours} keyboardType="decimal-pad" placeholder="0" onFocus={scrollToField('hours')} selectTextOnFocus />
        </View>

        <View onLayout={trackLayout('miles')}>
          <Text style={styles.label}>Current Miles (optional)</Text>
          <TextInput style={styles.input} value={currentMiles} onChangeText={setCurrentMiles} keyboardType="decimal-pad" placeholder="0" onFocus={scrollToField('miles')} selectTextOnFocus />
        </View>

        <Text style={styles.label}>Registration Expiry</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Text style={[styles.dateBtnText, !regExpiry && styles.dateBtnPlaceholder]}>
            {regExpiry ? format(parseISO(regExpiry), 'MMM d, yyyy') : 'Tap to select date'}
          </Text>
        </TouchableOpacity>
        {regExpiry ? (
          <TouchableOpacity onPress={() => setRegExpiry('')}>
            <Text style={styles.clearDate}>Clear date</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.hint}>You'll get reminders at 30 days, 7 days, and day of expiry</Text>

        {showDatePicker && (
          <DateTimePicker
            value={datePickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Vehicle'}</Text>
        </TouchableOpacity>

        <ConfirmModal
          visible={showDelete}
          title="Delete Vehicle"
          message="This will permanently delete this vehicle and all its maintenance data. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          destructive
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 200 },
  photoArea: { alignSelf: 'center', marginBottom: 20 },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center',
  },
  photoIcon: { fontSize: 28, marginBottom: 4 },
  photoText: { fontSize: 12, color: '#888' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0',
  },
  hint: { fontSize: 11, color: '#aaa', marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e0e0e0' },
  typeChipActive: { backgroundColor: '#2196F3' },
  typeChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  typeChipTextActive: { color: '#fff' },
  dateBtn: {
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  dateBtnText: { fontSize: 15, color: '#333' },
  dateBtnPlaceholder: { color: '#aaa' },
  clearDate: { fontSize: 13, color: '#F44336', marginTop: 6, fontWeight: '500' },
  saveBtn: {
    backgroundColor: '#2196F3', borderRadius: 8, paddingVertical: 14,
    alignItems: 'center', marginTop: 24, marginBottom: 32,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
