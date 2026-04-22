import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { RootStackParamList, VehicleNote } from '../models/types';
import {
  getNote,
  updateNoteContent,
  renameNote,
  togglePinNote,
  deleteNote,
} from '../db/notes';
import TextPromptModal from '../components/TextPromptModal';

type Props = NativeStackScreenProps<RootStackParamList, 'EditNote'>;

const AUTO_SAVE_DELAY_MS = 1000;

function formatUpdated(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return `today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `yesterday at ${format(d, 'h:mm a')}`;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export default function EditNoteScreen({ navigation, route }: Props) {
  const { noteId } = route.params;
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState<VehicleNote | null>(null);
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [renameVisible, setRenameVisible] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');

  const refresh = useCallback(async () => {
    const loaded = await getNote(noteId);
    if (loaded) {
      setNote(loaded);
      setContent(loaded.content);
      lastSavedContentRef.current = loaded.content;
      setSavedAt(loaded.updated_at);
      setMode(loaded.content.trim().length === 0 ? 'edit' : 'preview');
    }
  }, [noteId]);

  useEffect(() => { refresh(); }, [refresh]);

  const flushSave = useCallback(async (value: string) => {
    if (value === lastSavedContentRef.current) return;
    await updateNoteContent(noteId, value);
    lastSavedContentRef.current = value;
    setSavedAt(new Date().toISOString());
  }, [noteId]);

  const handleContentChange = (value: string) => {
    setContent(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { flushSave(value); }, AUTO_SAVE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (content !== lastSavedContentRef.current) {
        updateNoteContent(noteId, content).catch(() => {});
      }
    };
  }, [content, noteId]);

  const handleTogglePin = useCallback(async () => {
    if (!note) return;
    await togglePinNote(note.id);
    await refresh();
  }, [note, refresh]);

  const handleTogglePreview = useCallback(async () => {
    if (mode === 'edit' && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      await flushSave(content);
    }
    setMode((m) => (m === 'edit' ? 'preview' : 'edit'));
  }, [mode, flushSave, content]);

  const handleRenameConfirm = async (value: string) => {
    if (!note) return;
    setRenameVisible(false);
    await renameNote(note.id, value);
    await refresh();
  };

  const handleShare = async () => {
    if (!note) return;
    const body = `# ${note.title}\n\n${content}`;
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

  const handleDelete = () => {
    if (!note) return;
    Alert.alert('Delete Note', `Delete "${note.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          await deleteNote(note.id);
          navigation.goBack();
        },
      },
    ]);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: note?.title ?? 'Note',
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <TouchableOpacity onPress={handleTogglePin} hitSlop={8}>
            <Text style={{ fontSize: 18 }}>{note?.pinned ? '📌' : '📍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleTogglePreview} hitSlop={8}>
            <Text style={{ fontSize: 14, color: '#2196F3', fontWeight: '600' }}>
              {mode === 'edit' ? 'Preview' : 'Edit'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} hitSlop={8}>
            <Text style={{ fontSize: 18 }}>↗️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={8}>
            <Text style={{ fontSize: 18 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, note, mode, handleTogglePin, handleTogglePreview]);

  if (!note) {
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.titleBar} onPress={() => setRenameVisible(true)}>
          <Text style={styles.title} numberOfLines={1}>{note.title}</Text>
          <Text style={styles.renameHint}>Tap to rename</Text>
        </TouchableOpacity>

        {mode === 'edit' ? (
          <TextInput
            style={[styles.editor, { paddingBottom: insets.bottom + 60 }]}
            value={content}
            onChangeText={handleContentChange}
            placeholder={'Type your note here.\n\nSupports markdown:\n- **bold**\n- *italic*\n- # heading\n- lists, > quotes, `code`, [links](url)'}
            placeholderTextColor="#bbb"
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
        ) : (
          <ScrollView
            style={styles.previewScroll}
            contentContainerStyle={[styles.previewContent, { paddingBottom: insets.bottom + 60 }]}
          >
            {content.trim().length === 0 ? (
              <Text style={styles.previewEmpty}>This note is empty. Tap Edit to add content.</Text>
            ) : (
              <Markdown style={markdownStyles}>{content}</Markdown>
            )}
          </ScrollView>
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.footerText}>
            {savedAt ? `Saved ${formatUpdated(savedAt)}` : 'Unsaved'}
          </Text>
        </View>

        <TextPromptModal
          visible={renameVisible}
          title="Rename Note"
          placeholder="Note name"
          initialValue={note.title}
          confirmLabel="Rename"
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenameVisible(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  titleBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fafafa',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#222' },
  renameHint: { fontSize: 11, color: '#999', marginTop: 2 },
  editor: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    color: '#222',
  },
  previewScroll: { flex: 1 },
  previewContent: { padding: 16 },
  previewEmpty: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fafafa',
  },
  footerText: { fontSize: 11, color: '#888', textAlign: 'center' },
});

const markdownStyles = {
  body: { fontSize: 15, color: '#222', lineHeight: 22 },
  heading1: { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  heading2: { fontSize: 19, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  heading3: { fontSize: 17, fontWeight: '600', marginTop: 6, marginBottom: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  code_inline: { backgroundColor: '#f0f0f0', borderRadius: 4, paddingHorizontal: 4 },
  fence: { backgroundColor: '#f5f5f5', borderRadius: 6, padding: 10, marginVertical: 6 },
  blockquote: {
    backgroundColor: '#f7f7f7',
    borderLeftWidth: 3,
    borderLeftColor: '#bbb',
    paddingLeft: 10,
    paddingVertical: 4,
    marginVertical: 4,
  },
  link: { color: '#2196F3' },
  hr: { backgroundColor: '#ddd', height: 1, marginVertical: 12 },
} as const;
