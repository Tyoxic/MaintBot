import React, { useCallback, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { RootStackParamList, VehicleNote } from '../models/types';
import {
  getNotes,
  searchNotes,
  createNote,
  renameNote,
  togglePinNote,
  deleteNote,
} from '../db/notes';
import { getVehicle } from '../db/vehicles';
import EmptyState from '../components/EmptyState';
import TextPromptModal from '../components/TextPromptModal';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleNotes'>;

type PromptMode = 'create' | 'rename';

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

function formatDate(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return format(d, "'Today' h:mm a");
  if (isYesterday(d)) return format(d, "'Yesterday' h:mm a");
  return format(d, 'MMM d, yyyy');
}

export default function VehicleNotesScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<VehicleNote[]>([]);
  const [query, setQuery] = useState('');
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptMode, setPromptMode] = useState<PromptMode>('create');
  const [renameTarget, setRenameTarget] = useState<VehicleNote | null>(null);

  const refresh = useCallback(async () => {
    const q = query.trim();
    const rows = q ? await searchNotes(vehicleId, q) : await getNotes(vehicleId);
    setNotes(rows);
  }, [vehicleId, query]);

  useLayoutEffect(() => {
    (async () => {
      const v = await getVehicle(vehicleId);
      if (v) navigation.setOptions({ title: `${v.name} – Notes` });
    })();
  }, [navigation, vehicleId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const openCreatePrompt = () => {
    setPromptMode('create');
    setRenameTarget(null);
    setPromptVisible(true);
  };

  const openRenamePrompt = (note: VehicleNote) => {
    setPromptMode('rename');
    setRenameTarget(note);
    setPromptVisible(true);
  };

  const handlePromptConfirm = async (value: string) => {
    setPromptVisible(false);
    if (promptMode === 'create') {
      const id = await createNote(vehicleId, value);
      await refresh();
      navigation.navigate('EditNote', { vehicleId, noteId: id });
    } else if (renameTarget) {
      await renameNote(renameTarget.id, value);
      await refresh();
    }
  };

  const openNote = (note: VehicleNote) => {
    navigation.navigate('EditNote', { vehicleId, noteId: note.id });
  };

  const handleTogglePin = async (note: VehicleNote) => {
    await togglePinNote(note.id);
    await refresh();
  };

  const handleDelete = (note: VehicleNote) => {
    Alert.alert('Delete Note', `Delete "${note.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(note.id);
          await refresh();
        },
      },
    ]);
  };

  const handleShare = async (note: VehicleNote) => {
    const body = `# ${note.title}\n\n${note.content}`;
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Share unavailable', 'Sharing is not available on this device.');
      return;
    }
    const safeTitle = note.title.replace(/[^a-z0-9-_\s]/gi, '').replace(/\s+/g, '-') || 'note';
    const file = new File(Paths.cache, `${safeTitle}.md`);
    file.write(body);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/markdown',
      dialogTitle: `Share "${note.title}"`,
    });
  };

  const openActionMenu = (note: VehicleNote) => {
    Alert.alert(note.title, undefined, [
      { text: 'Rename', onPress: () => openRenamePrompt(note) },
      {
        text: note.pinned ? 'Unpin' : 'Pin to Top',
        onPress: () => handleTogglePin(note),
      },
      { text: 'Share as Markdown', onPress: () => handleShare(note) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(note) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: VehicleNote }) => {
    const preview = stripMarkdown(item.content);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openNote(item)}
        onLongPress={() => openActionMenu(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowHeader}>
          {item.pinned ? <Text style={styles.pin}>📌</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        </View>
        {preview ? (
          <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
        ) : (
          <Text style={styles.empty}>Empty note</Text>
        )}
        <Text style={styles.date}>Updated {formatDate(item.updated_at)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          onEndEditing={refresh}
          onSubmitEditing={refresh}
          placeholder="Search notes"
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={
          notes.length === 0
            ? styles.emptyContainer
            : [styles.list, { paddingBottom: insets.bottom + 96 }]
        }
        ListEmptyComponent={
          <EmptyState
            icon="📝"
            title={query ? 'No matches' : 'No notes yet'}
            subtitle={query ? 'Try a different search' : 'Tap + to add your first note'}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={openCreatePrompt}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <TextPromptModal
        visible={promptVisible}
        title={promptMode === 'create' ? 'New Note' : 'Rename Note'}
        message={
          promptMode === 'create'
            ? 'Give this note a name. You can change it later.'
            : undefined
        }
        placeholder="e.g. Jetting, Bought from Mike, Suspension settings"
        initialValue={promptMode === 'rename' ? renameTarget?.title ?? '' : ''}
        confirmLabel={promptMode === 'create' ? 'Create' : 'Rename'}
        onConfirm={handlePromptConfirm}
        onCancel={() => setPromptVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  list: { paddingVertical: 4 },
  emptyContainer: { flex: 1 },
  row: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pin: { fontSize: 12, marginRight: 6 },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: '#222' },
  preview: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 6 },
  empty: { fontSize: 13, color: '#bbb', fontStyle: 'italic', marginBottom: 6 },
  date: { fontSize: 11, color: '#999' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300', marginTop: -2 },
});
