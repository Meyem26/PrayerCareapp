import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryPicker } from '@/components/prayer/CategoryPicker';
import { ShareWithGroupPicker } from '@/components/groups/ShareWithGroupPicker';
import { SchedulePicker } from '@/components/prayer/SchedulePicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { generateVerseWithAi } from '@/lib/api/ai';
import { consumeAiPrayerDraft } from '@/lib/ai-draft-store';
import { fetchMyGroups } from '@/lib/api/groups';
import {
  createPrayer,
  fetchPrayerCategories,
  fetchPrayerDetail,
  updatePrayer,
} from '@/lib/api/prayers';
import { getScheduleFromPrayer, getScriptureFromPrayer, isValidSchedule } from '@/lib/prayer-utils';
import type { GroupWithMeta } from '@/types/group';
import type { PrayerCategory, ScheduleType } from '@/types/prayer';

export default function CreatePrayerScreen() {
  const { heart, id, source } = useLocalSearchParams<{
    heart?: string;
    id?: string;
    source?: string;
  }>();
  const { user, profile } = useAuth();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<PrayerCategory[]>([]);
  const [title, setTitle] = useState('');
  const [prayerPoint, setPrayerPoint] = useState('');
  const [body, setBody] = useState(typeof heart === 'string' ? heart : '');
  const [scriptureRef, setScriptureRef] = useState('');
  const [scriptureText, setScriptureText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [verseLoading, setVerseLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiPromptSnapshot, setAiPromptSnapshot] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'personal' | 'group'>('personal');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [creatorKeepsPersonal, setCreatorKeepsPersonal] = useState(true);
  const [myGroups, setMyGroups] = useState<GroupWithMeta[]>([]);

  useEffect(() => {
    fetchPrayerCategories().then(({ data }) => setCategories(data));
    if (!isEditing) {
      fetchMyGroups().then(({ data }) => setMyGroups(data));
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || source !== 'ai') return;

    const draft = consumeAiPrayerDraft();
    if (!draft) return;

    setTitle(draft.title);
    setPrayerPoint(draft.prayer_point);
    setBody(draft.prayer_text);
    setScriptureRef(draft.scripture_reference);
    setScriptureText(draft.scripture_text);
    setAiGenerated(true);
    setAiPromptSnapshot(typeof heart === 'string' ? heart : null);
  }, [isEditing, source, heart]);

  useEffect(() => {
    if (!isEditing || !id) return;

    fetchPrayerDetail(id).then(({ data, error: fetchError }) => {
      setInitialLoading(false);
      if (fetchError || !data) {
        setError(fetchError ?? 'Could not load prayer.');
        return;
      }

      setTitle(data.title);
      setPrayerPoint(data.prayer_point ?? '');
      setBody(data.body);
      setCategoryId(data.category_id);
      setAiGenerated(data.ai_generated);

      const schedule = getScheduleFromPrayer(data);
      if (schedule) {
        setScheduleType(schedule.schedule_type);
        setWeekdays(schedule.weekdays ?? []);
      }

      const scripture = getScriptureFromPrayer(data);
      if (scripture) {
        setScriptureRef(scripture.reference);
        setScriptureText(scripture.text);
      }
    });
  }, [id, isEditing]);

  async function handleGenerateVerse() {
    setError(null);

    if (!title.trim() || !prayerPoint.trim()) {
      setError('Add a title and prayer point first so AI can suggest a fitting verse.');
      return;
    }

    setVerseLoading(true);
    const { data, error: verseError } = await generateVerseWithAi(
      title.trim(),
      prayerPoint.trim(),
      profile?.bible_translation_id,
    );
    setVerseLoading(false);

    if (verseError || !data) {
      setError(verseError ?? 'Could not generate verse.');
      return;
    }

    setScriptureRef(data.reference);
    setScriptureText(data.text);
  }

  async function handleSave() {
    setError(null);

    if (!title.trim() || !body.trim()) {
      setError('Please add a title and prayer.');
      return;
    }

    if (!isValidSchedule(scheduleType, weekdays)) {
      setError('Please select at least one day for your schedule.');
      return;
    }

    if (shareMode === 'group' && !selectedGroupId) {
      setError('Please select a group or create a new one to share with.');
      return;
    }

    if (!user?.id || !profile) {
      setError('You must be signed in.');
      return;
    }

    setLoading(true);

    if (isEditing && id) {
      const result = await updatePrayer(
        id,
        user.id,
        {
          title,
          prayer_point: prayerPoint,
          body,
          category_id: categoryId,
          scheduleType,
          weekdays,
          scriptureReference: scriptureRef,
          scriptureText: scriptureText,
          translationId: profile.bible_translation_id,
        },
        profile.timezone,
      );

      setLoading(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.replace({ pathname: '/prayer/[id]', params: { id } });
      return;
    }

    const result = await createPrayer({
      creatorId: user.id,
      timezone: profile.timezone,
      title,
      prayerPoint,
      body,
      categoryId,
      scheduleType,
      weekdays,
      scriptureReference: scriptureRef,
      scriptureText,
      translationId: profile.bible_translation_id,
      aiGenerated,
      aiPromptSnapshot,
      groupId: shareMode === 'group' ? selectedGroupId : null,
      creatorKeepsPersonal: shareMode === 'group' ? creatorKeepsPersonal : true,
    });

    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to save prayer.');
      return;
    }

    router.replace({ pathname: '/prayer/[id]', params: { id: result.data.id } });
  }

  if (initialLoading) {
    return (
      <Screen centered>
        <AppText muted>Loading prayer...</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <AppText variant="greeting">
              {isEditing ? 'Edit prayer' : aiGenerated ? 'Review your prayer' : 'Write your prayer'}
            </AppText>
            <AppText muted>
              {aiGenerated
                ? 'AI drafted this as a starting point. Edit anything — nothing is locked.'
                : 'Everything here stays editable — take your time.'}
            </AppText>
          </View>

          <Input label="Title" value={title} onChangeText={setTitle} placeholder="What are you praying for?" />
          <Input
            label="Prayer point"
            value={prayerPoint}
            onChangeText={setPrayerPoint}
            placeholder="One sentence summary (optional)"
          />
          <TextArea
            label="Prayer"
            value={body}
            onChangeText={setBody}
            placeholder="Write your prayer in your own words..."
          />

          <View style={styles.section}>
            <AppText variant="label">Scripture to stand on</AppText>
            <AppText variant="bodySmall" muted>
              Would you like a Bible verse to stand on? Write your own or generate one.
            </AppText>
            <Input
              label="Reference"
              value={scriptureRef}
              onChangeText={setScriptureRef}
              placeholder="e.g. Philippians 4:6-7"
            />
            <TextArea
              label="Verse text"
              value={scriptureText}
              onChangeText={setScriptureText}
              placeholder="Full verse text..."
              style={styles.shortArea}
            />
            <Button
              title="Generate one for me"
              variant="secondary"
              loading={verseLoading}
              onPress={handleGenerateVerse}
            />
          </View>

          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />

          {!isEditing ? (
            <View style={styles.section}>
              <AppText variant="label">Who is this prayer for?</AppText>
              <OptionCard
                label="Personal"
                description="Only you can see this prayer"
                selected={shareMode === 'personal'}
                onPress={() => {
                  setShareMode('personal');
                  setSelectedGroupId(null);
                  setCreatorKeepsPersonal(true);
                }}
              />
              <OptionCard
                label="Shared with group"
                description="Group members see this on their Today list"
                selected={shareMode === 'group'}
                onPress={() => {
                  setShareMode('group');
                  setError(null);
                }}
              />
              {shareMode === 'group' ? (
                <ShareWithGroupPicker
                  groups={myGroups}
                  value={selectedGroupId}
                  onChange={setSelectedGroupId}
                  creatorKeepsPersonal={creatorKeepsPersonal}
                  onCreatorKeepsPersonalChange={setCreatorKeepsPersonal}
                  onGroupCreated={(group) => {
                    setMyGroups((prev) => {
                      if (prev.some((g) => g.id === group.id)) return prev;
                      return [group, ...prev];
                    });
                  }}
                />
              ) : null}
            </View>
          ) : null}

          <SchedulePicker
            value={scheduleType}
            weekdays={weekdays}
            onChangeSchedule={setScheduleType}
            onChangeWeekdays={setWeekdays}
          />

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <Button
            title={isEditing ? 'Save Changes' : 'Save Prayer'}
            loading={loading}
            onPress={handleSave}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    gap: theme.spacing.sm,
  },
  shortArea: {
    minHeight: 88,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
