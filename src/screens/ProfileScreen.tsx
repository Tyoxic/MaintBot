import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { RootStackParamList } from '../models/types';
import { getProfile, saveProfile } from '../db/profile';
import { exportData, pickAndImportData } from '../utils/backup';
import { sendBugReport } from '../utils/bugReport';
import ConfirmModal from '../components/ConfirmModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      if (profile) {
        setName(profile.name);
        setEmail(profile.email);
      }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveProfile(name.trim(), email.trim());
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }, [name, email]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportData();
    } catch {
      Alert.alert('Error', 'Failed to export data.');
    } finally {
      setExporting(false);
    }
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    if (__DEV__) {
      Alert.alert('Dev Mode', 'Updates are only available in production builds.');
      return;
    }
    setCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert('Up to Date', 'You are running the latest version.');
        return;
      }
      Alert.alert(
        'Update Available',
        'A new version of MaintBot is ready. Install now? The app will restart.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Install',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch {
                Alert.alert('Error', 'Failed to install update. Try again later.');
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to check for updates. Check your connection and try again.');
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  const handleSendBugReport = useCallback(async () => {
    setSendingReport(true);
    try {
      await sendBugReport();
    } catch {
      Alert.alert('Error', 'Failed to open email composer.');
    } finally {
      setSendingReport(false);
    }
  }, []);

  const handleImport = useCallback(async () => {
    setShowImportConfirm(false);
    setImporting(true);
    try {
      const summary = await pickAndImportData();
      if (summary) {
        Alert.alert(
          'Import Complete',
          `Imported ${summary.vehicles} vehicle(s), ${summary.maintenanceItems} maintenance item(s), ${summary.maintenanceLog} log entr(ies), ${summary.rideLog} ride(s).`,
          [{ text: 'OK', onPress: () => navigation.navigate('Garage') }]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to import data. Make sure you selected a valid MaintBot backup file.');
    } finally {
      setImporting(false);
    }
  }, [navigation]);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const updateTag = Updates.updateId
    ? `ota:${Updates.updateId.slice(0, 8)}`
    : 'embedded';

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
      <Text style={styles.sectionHeader}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.disabledBtn]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Data Management</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.primaryBtn, exporting && styles.disabledBtn]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Export All Data</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, importing && styles.disabledBtn]}
          onPress={() => setShowImportConfirm(true)}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color="#2196F3" size="small" />
          ) : (
            <Text style={styles.outlineBtnText}>Import Data</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>App Updates</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.primaryBtn, checkingUpdate && styles.disabledBtn]}
          onPress={handleCheckForUpdates}
          disabled={checkingUpdate}
        >
          {checkingUpdate ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Check for Updates</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Help & Feedback</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.primaryBtn, sendingReport && styles.disabledBtn]}
          onPress={handleSendBugReport}
          disabled={sendingReport}
        >
          {sendingReport ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Send Bug Report</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.helperText}>
          Opens your email app with a pre-filled message including device info,
          app version, and recent error logs. You can review and edit before sending.
        </Text>
      </View>

      <Text style={styles.versionText}>MaintBot v{appVersion} ({updateTag})</Text>

      <ConfirmModal
        visible={showImportConfirm}
        title="Import Data"
        message="This will replace all existing data with the contents of the backup file. This action cannot be undone."
        confirmLabel="Import"
        onConfirm={handleImport}
        onCancel={() => setShowImportConfirm(false)}
        destructive
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  primaryBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  outlineBtnText: { color: '#2196F3', fontSize: 16, fontWeight: '600' },
  disabledBtn: { opacity: 0.6 },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
    lineHeight: 16,
  },
  versionText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 13,
    marginTop: 16,
  },
});
