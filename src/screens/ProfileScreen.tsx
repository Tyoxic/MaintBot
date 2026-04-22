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
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as WebBrowser from 'expo-web-browser';
import { RootStackParamList } from '../models/types';
import { getProfile, saveProfile } from '../db/profile';
import { exportData, pickAndImportData } from '../utils/backup';
import { sendBugReport } from '../utils/bugReport';
import { checkApkVersion, ApkStatus } from '../utils/apkVersion';
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
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [apkStatus, setApkStatus] = useState<ApkStatus | null>(null);
  const [checkingApk, setCheckingApk] = useState(false);
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

  const runApkCheck = useCallback(async () => {
    setCheckingApk(true);
    try {
      const status = await checkApkVersion();
      setApkStatus(status);
    } finally {
      setCheckingApk(false);
    }
  }, []);

  useEffect(() => {
    if (__DEV__) return;
    runApkCheck();
  }, [runApkCheck]);

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

  const handleDownloadLatestApk = useCallback(async () => {
    setOpeningBrowser(true);
    try {
      await WebBrowser.openBrowserAsync('https://github.com/Tyoxic/MaintBot/releases/latest');
    } catch {
      Alert.alert('Error', 'Failed to open browser. Visit github.com/Tyoxic/MaintBot/releases/latest to download.');
    } finally {
      setOpeningBrowser(false);
    }
  }, []);

  const handleShareInstallLink = useCallback(async () => {
    setSharingLink(true);
    try {
      await Share.share({
        message:
          'Check out MaintBot — a privacy-first vehicle maintenance tracker for Android. All data stays on your phone. Install: https://github.com/Tyoxic/MaintBot/releases/latest',
      });
    } catch {
      Alert.alert('Error', 'Failed to open share sheet.');
    } finally {
      setSharingLink(false);
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
          `Imported ${summary.vehicles} vehicle(s), ${summary.maintenanceItems} maintenance item(s), ${summary.maintenanceLog} log entries, ${summary.rideLog} ride(s).`,
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
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

        {apkStatus && (
          <TouchableOpacity
            style={styles.apkStatusRow}
            onPress={runApkCheck}
            disabled={checkingApk}
            activeOpacity={0.7}
          >
            {checkingApk ? (
              <ActivityIndicator color="#888" size="small" />
            ) : apkStatus.status === 'update-available' ? (
              <Text style={styles.apkStatusUpdate}>
                ⚠ New APK v{apkStatus.latestVersion} available (you have v{apkStatus.currentVersion}) — tap to recheck
              </Text>
            ) : apkStatus.status === 'up-to-date' ? (
              <Text style={styles.apkStatusOk}>
                ✓ APK is up to date (v{apkStatus.currentVersion}) — tap to recheck
              </Text>
            ) : (
              <Text style={styles.apkStatusError}>
                Couldn't check for APK updates — tap to retry
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.outlineBtn,
            apkStatus?.status === 'update-available' && styles.highlightBtn,
            (openingBrowser || apkStatus?.status === 'up-to-date') && styles.disabledBtn,
          ]}
          onPress={handleDownloadLatestApk}
          disabled={openingBrowser || apkStatus?.status === 'up-to-date'}
        >
          {openingBrowser ? (
            <ActivityIndicator color="#2196F3" size="small" />
          ) : (
            <Text
              style={[
                styles.outlineBtnText,
                apkStatus?.status === 'update-available' && styles.highlightBtnText,
              ]}
            >
              {apkStatus?.status === 'update-available' && apkStatus.latestVersion
                ? `Download v${apkStatus.latestVersion} →`
                : apkStatus?.status === 'up-to-date'
                ? 'Already on Latest APK'
                : 'Download Latest APK'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.outlineBtn, sharingLink && styles.disabledBtn]}
          onPress={handleShareInstallLink}
          disabled={sharingLink}
        >
          {sharingLink ? (
            <ActivityIndicator color="#2196F3" size="small" />
          ) : (
            <Text style={styles.outlineBtnText}>Share Install Link</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.helperText}>
          "Check for Updates" pulls silent JS updates. "Download Latest APK" is for
          major installable versions. "Share Install Link" opens the share sheet with
          a link friends can use to install MaintBot.
        </Text>
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
    </KeyboardAvoidingView>
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
  highlightBtn: { borderColor: '#FF9800', backgroundColor: '#FFF3E0' },
  highlightBtnText: { color: '#E65100' },
  apkStatusRow: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  apkStatusOk: { fontSize: 12, color: '#2e7d32', fontWeight: '500' },
  apkStatusUpdate: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
    textAlign: 'center',
  },
  apkStatusError: { fontSize: 12, color: '#888', fontStyle: 'italic' },
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
