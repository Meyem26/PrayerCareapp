import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareWithGroupPicker } from '@/components/groups/ShareWithGroupPicker';
import { CategoryPicker } from '@/components/prayer/CategoryPicker';
import { ReviewRow } from '@/components/prayer/create-flow/ReviewRow';
import { StepProgress } from '@/components/prayer/create-flow/StepProgress';
import { ReminderTimesPicker } from '@/components/prayer/ReminderTimesPicker';
import { SchedulePicker } from '@/components/prayer/SchedulePicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { OptionCard } from '@/components/ui/OptionCard';
import { SelectField } from '@/components/ui/SelectField';
import { TextArea } from '@/components/ui/TextArea';
import { useToast } from '@/components/ui/Toast';
import { formatScriptureAttribution } from '@/constants/bible-translations';
import {
  describeGroupVisibility,
  groupVisibilityOptions,
  toGroupVisibility,
} from '@/constants/prayer-visibility';
import { formatReminderTimeLabel, normalizeReminderTime } from '@/constants/reminders';
import { getScheduleLabel, SCHEDULE_OPTIONS, WEEKDAY_LABELS } from '@/constants/schedule';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardOverlap } from '@/hooks/useKeyboard';
import { consumeAiPrayerDraft } from '@/lib/ai-draft-store';
import { generatePrayerWithAi, generateVerseWithAi } from '@/lib/api/ai';
import { fetchScriptureFromApi } from '@/lib/api/bible';
import { fetchMyGroups } from '@/lib/api/groups';
import {
  createPrayer,
  fetchPrayerCategories,
  fetchPrayerDetail,
  updatePrayer,
} from '@/lib/api/prayers';
import { ensureNotificationPermissions } from '@/lib/notifications/permissions';
import { getScheduleFromPrayer, getScriptureFromPrayer, isValidSchedule } from '@/lib/prayer-utils';
import type { GeneratedPrayer } from '@/types/ai';
import type { GroupWithMeta } from '@/types/group';
import type { PrayerCategory, ScheduleType } from '@/types/prayer';
import type { ReminderTimeDraft } from '@/types/reminder';

type StepId = 'prayer' | 'category' | 'location' | 'visibility' | 'schedule' | 'review';

const STEP_COPY: Record<StepId, { title: string; subtitle: string }> = {
  prayer: {
    title: 'What are you praying about?',
    subtitle: 'Write it in your own words, or let AI help. Everything stays editable.',
  },
  category: {
    title: 'What is this prayer about?',
    subtitle: 'Pick the theme that fits best. It helps you look back on how God answered.',
  },
  location: {
    title: 'Where should this prayer live?',
    subtitle: 'Keep it between you and God, or carry it together with others.',
  },
  visibility: {
    title: 'Who should see this prayer?',
    subtitle: 'Only members of the group can ever see group prayers.',
  },
  schedule: {
    title: 'When would you like to pray?',
    subtitle: 'PrayerCare brings it back on the right days, with a gentle reminder if you like.',
  },
  review: {
    title: 'Review your prayer',
    subtitle: 'Take a breath. You can change anything before saving.',
  },
};

type Snapshot = {
  title: string;
  prayerPoint: string;
  body: string;
  categoryId: string | null;
  scheduleType: ScheduleType;
  weekdays: number[];
  reminders: ReminderTimeDraft[];
  scriptureRef: string;
  scriptureText: string;
};

function snapshotKey(value: Snapshot): string {
  return JSON.stringify({
    ...value,
    reminders: value.reminders.map((item) => `${item.time}:${item.enabled}`).sort(),
  });
}

export default function CreatePrayerScreen() {
  const { heart, id, source } = useLocalSearchParams<{
    heart?: string;
    id?: string;
    source?: string;
  }>();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const isEditing = Boolean(id);

  const rootRef = useRef<View>(null);
  const keyboardOverlap = useKeyboardOverlap(rootRef);
  const initialSnapshot = useRef<string | null>(null);

  const [step, setStep] = useState<StepId>('prayer');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [returnToReview, setReturnToReview] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const [categories, setCategories] = useState<PrayerCategory[]>([]);
  const [title, setTitle] = useState('');
  const [prayerPoint, setPrayerPoint] = useState('');
  const [body, setBody] = useState(typeof heart === 'string' && source !== 'ai' ? heart : '');
  const [scriptureRef, setScriptureRef] = useState('');
  const [scriptureText, setScriptureText] = useState('');
  const [scriptureNote, setScriptureNote] = useState<string | null>(null);
  const [scriptureTranslationId, setScriptureTranslationId] = useState<string | null>(null);
  const [verseOpen, setVerseOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [reminders, setReminders] = useState<ReminderTimeDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [verseLoading, setVerseLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiPromptSnapshot, setAiPromptSnapshot] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'personal' | 'group'>('personal');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [creatorKeepsPersonal, setCreatorKeepsPersonal] = useState(true);
  const [myGroups, setMyGroups] = useState<GroupWithMeta[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);

  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ['prayer', 'category'];
    if (!isEditing) {
      list.push('location');
      if (shareMode === 'group') list.push('visibility');
    }
    list.push('schedule', 'review');
    return list;
  }, [isEditing, shareMode]);

  const stepIndex = Math.max(0, steps.indexOf(step));
  const selectedGroup = myGroups.find((group) => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    fetchPrayerCategories().then(({ data }) => setCategories(data));
    fetchMyGroups().then(({ data }) => {
      setMyGroups(data);
      setGroupsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isEditing || source !== 'ai') return;
    const draft = consumeAiPrayerDraft();
    if (!draft) return;
    applyAiDraft(draft, typeof heart === 'string' ? heart : null);
  }, [isEditing, source, heart]);

  useEffect(() => {
    if (!isEditing || !id) return;

    fetchPrayerDetail(id).then(({ data, error: fetchError }) => {
      setInitialLoading(false);
      if (fetchError || !data) {
        setError(fetchError ?? 'Could not load prayer.');
        return;
      }

      const loadedReminders = (data.prayer_reminders ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.reminder_time.localeCompare(b.reminder_time))
        .map((row) => ({
          key: row.id,
          time: normalizeReminderTime(row.reminder_time),
          enabled: row.enabled,
        }));
      const schedule = getScheduleFromPrayer(data);
      const scripture = getScriptureFromPrayer(data);

      setTitle(data.title);
      setPrayerPoint(data.prayer_point ?? '');
      setBody(data.body);
      setCategoryId(data.category_id);
      setAiGenerated(data.ai_generated);
      setReminders(loadedReminders);
      setShareMode(data.visibility === 'group' ? 'group' : 'personal');
      setSelectedGroupId(data.group_id);
      setCreatorKeepsPersonal(data.creator_keeps_personal);
      if (schedule) {
        setScheduleType(schedule.schedule_type);
        setWeekdays(schedule.weekdays ?? []);
      }
      if (scripture) {
        setScriptureRef(scripture.reference);
        setScriptureText(scripture.text);
      }

      initialSnapshot.current = snapshotKey({
        title: data.title,
        prayerPoint: data.prayer_point ?? '',
        body: data.body,
        categoryId: data.category_id,
        scheduleType: schedule?.schedule_type ?? 'daily',
        weekdays: schedule?.weekdays ?? [],
        reminders: loadedReminders,
        scriptureRef: scripture?.reference ?? '',
        scriptureText: scripture?.text ?? '',
      });
    });
  }, [id, isEditing]);

  const hasUnsavedWork = isEditing
    ? initialSnapshot.current !== null &&
      initialSnapshot.current !==
        snapshotKey({
          title,
          prayerPoint,
          body,
          categoryId,
          scheduleType,
          weekdays,
          reminders,
          scriptureRef,
          scriptureText,
        })
    : Boolean(title.trim() || prayerPoint.trim() || body.trim());

  function applyAiDraft(draft: GeneratedPrayer, prompt: string | null) {
    setTitle(draft.title);
    setPrayerPoint(draft.prayer_point);
    setBody(draft.prayer_text);
    setScriptureRef(draft.scripture_reference);
    setScriptureText(draft.scripture_text);
    setScriptureNote(draft.scripture_note ?? null);
    setScriptureTranslationId(draft.scripture_translation_id ?? null);
    setAiGenerated(true);
    setAiPromptSnapshot(prompt);
  }

  function close() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  function requestClose() {
    Keyboard.dismiss();
    if (hasUnsavedWork && !loading) {
      setConfirmDiscard(true);
      return;
    }
    close();
  }

  function validateStep(target: StepId): string | null {
    switch (target) {
      case 'prayer':
        if (!title.trim() || !prayerPoint.trim() || !body.trim()) {
          return 'Please add a title, a prayer point, and your prayer.';
        }
        return null;
      case 'location':
        if (shareMode === 'group' && !selectedGroupId) {
          return 'Choose a group, or create one to share with.';
        }
        return null;
      case 'schedule':
        if (!isValidSchedule(scheduleType, weekdays)) {
          return 'Choose at least one day of the week.';
        }
        return null;
      default:
        return null;
    }
  }

  function goTo(target: StepId, nextDirection: 'forward' | 'back') {
    Keyboard.dismiss();
    setError(null);
    setDirection(nextDirection);
    setStep(target);
  }

  function goNext() {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    if (returnToReview) {
      setReturnToReview(false);
      goTo('review', 'forward');
      return;
    }
    const next = steps[stepIndex + 1];
    if (next) goTo(next, 'forward');
  }

  function goBack() {
    if (returnToReview) {
      setReturnToReview(false);
      goTo('review', 'back');
      return;
    }
    const previous = steps[stepIndex - 1];
    if (previous) {
      goTo(previous, 'back');
    } else {
      requestClose();
    }
  }

  function editFromReview(target: StepId) {
    setReturnToReview(true);
    goTo(target, 'back');
  }

  // Android back button walks back through steps instead of dismissing the whole flow.
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBackRef.current();
      return true;
    });
    return () => subscription.remove();
  }, []);

  async function handleDraftWithAi() {
    setError(null);
    const prompt =
      aiGenerated && aiPromptSnapshot
        ? aiPromptSnapshot
        : body.trim() || prayerPoint.trim() || title.trim();

    if (!prompt) {
      setError('Write a few words about what is on your heart first.');
      return;
    }

    Keyboard.dismiss();
    setAiLoading(true);
    const { data, error: aiError } = await generatePrayerWithAi(prompt, profile?.bible_translation_id);
    setAiLoading(false);

    if (aiError || !data) {
      setError(aiError ?? 'Could not generate a prayer. Please try again.');
      return;
    }

    applyAiDraft(data, prompt);
  }

  async function handleGenerateVerse() {
    setError(null);
    setScriptureNote(null);

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
    setScriptureTranslationId(data.translation_id ?? null);
    setScriptureNote(null);
  }

  async function handleFetchOfficialVerse() {
    setError(null);
    setScriptureNote(null);

    if (!scriptureRef.trim()) {
      setError('Enter a Scripture reference first (e.g. Philippians 4:6-7).');
      return;
    }

    setVerseLoading(true);
    const { data, error: fetchError } = await fetchScriptureFromApi(
      scriptureRef.trim(),
      profile?.bible_translation_id,
    );
    setVerseLoading(false);

    if (fetchError || !data) {
      setError(fetchError ?? 'Could not look up that verse.');
      setScriptureText('');
      return;
    }

    setScriptureRef(data.reference);
    setScriptureText(data.text);
    setScriptureTranslationId(data.translation_id ?? null);
  }

  function handleClearVerse() {
    setScriptureRef('');
    setScriptureText('');
    setScriptureNote(null);
    setScriptureTranslationId(null);
    setVerseOpen(false);
  }

  async function handleSave() {
    setError(null);

    for (const target of steps) {
      const problem = validateStep(target);
      if (problem) {
        goTo(target, 'back');
        setError(problem);
        return;
      }
    }

    if (!user?.id || !profile) {
      setError('You must be signed in.');
      return;
    }

    if (reminders.some((item) => item.enabled) && Platform.OS !== 'web') {
      const granted = await ensureNotificationPermissions();
      if (!granted) {
        setError('Please allow notifications so PrayerCare can remind you at the times you chose.');
        return;
      }
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
          scriptureText,
          translationId: profile.bible_translation_id,
          reminders,
        },
        profile.timezone,
      );

      setLoading(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      showToast({ message: 'Prayer updated.', tone: 'success' });
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
      reminders,
    });

    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to save prayer.');
      return;
    }

    showToast({ message: 'Your prayer is saved. May God meet you here.', tone: 'success' });
    router.replace({ pathname: '/prayer/[id]', params: { id: result.data.id } });
  }

  const categoryLabel = categories.find((category) => category.id === categoryId)?.label ?? null;
  const scheduleOption = SCHEDULE_OPTIONS.find((option) => option.type === scheduleType);
  const scheduleValue =
    scheduleType === 'specific_weekdays' && weekdays.length > 0
      ? `${getScheduleLabel(scheduleType)} · ${weekdays.map((day) => WEEKDAY_LABELS[day]).join(', ')}`
      : getScheduleLabel(scheduleType);
  const sortedReminders = [...reminders].sort((a, b) => a.time.localeCompare(b.time));
  const activeReminders = sortedReminders.filter((item) => item.enabled);
  const pausedCount = sortedReminders.length - activeReminders.length;

  const copy =
    step === 'prayer' && isEditing
      ? { title: 'Edit your prayer', subtitle: 'Change anything, then step through to save.' }
      : STEP_COPY[step];

  const primaryLabel =
    step === 'review'
      ? isEditing
        ? 'Save changes'
        : 'Save prayer'
      : returnToReview
        ? 'Back to review'
        : step === 'category' && !categoryId
          ? 'Skip for now'
          : 'Next';

  const footerBottom =
    keyboardOverlap > 0 ? keyboardOverlap + theme.spacing.sm : Math.max(insets.bottom, theme.spacing.md);

  function renderStep() {
    switch (step) {
      case 'prayer':
        return (
          <View style={styles.stepBody}>
            {aiGenerated && !isEditing ? (
              <View style={styles.aiBanner}>
                <AppText style={styles.aiBannerTitle}>✦ Drafted with AI</AppText>
                <AppText variant="bodySmall" style={styles.aiBannerText}>
                  A starting point from what you shared. Make it your own — nothing is locked.
                </AppText>
                {aiPromptSnapshot ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleDraftWithAi}
                    disabled={aiLoading}
                    hitSlop={8}>
                    <AppText accent style={styles.aiBannerAction}>
                      {aiLoading ? 'Writing a fresh draft…' : 'Try another draft'}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Input
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Mum's recovery"
              returnKeyType="next"
            />
            <Input
              label="Prayer point"
              value={prayerPoint}
              onChangeText={setPrayerPoint}
              placeholder="In one sentence, what are you asking God for?"
            />
            <TextArea
              label="Your prayer"
              value={body}
              onChangeText={setBody}
              placeholder="Write your prayer in your own words..."
              style={styles.prayerArea}
            />

            {!isEditing && !aiGenerated ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleDraftWithAi}
                disabled={aiLoading}
                style={({ pressed }) => [styles.aiAssist, pressed && styles.pressed]}>
                {aiLoading ? (
                  <ActivityIndicator color={theme.colors.accent} />
                ) : (
                  <AppText style={styles.aiAssistIcon}>✦</AppText>
                )}
                <View style={styles.aiAssistText}>
                  <AppText style={styles.aiAssistTitle}>
                    {aiLoading ? 'Preparing a prayer grounded in Scripture…' : 'Help me put it into words'}
                  </AppText>
                  {!aiLoading ? (
                    <AppText variant="bodySmall" muted>
                      AI drafts a prayer from what you wrote. You review it before anything is saved.
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            ) : null}

            <ScriptureSection
              open={verseOpen}
              onOpen={() => setVerseOpen(true)}
              reference={scriptureRef}
              text={scriptureText}
              note={scriptureNote}
              translationId={scriptureTranslationId}
              loading={verseLoading}
              onChangeReference={setScriptureRef}
              onChangeText={setScriptureText}
              onSuggest={handleGenerateVerse}
              onLookUp={handleFetchOfficialVerse}
              onClear={handleClearVerse}
              onDone={() => setVerseOpen(false)}
            />
          </View>
        );

      case 'category':
        return (
          <View style={styles.stepBody}>
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          </View>
        );

      case 'location':
        return (
          <View style={styles.stepBody}>
            <OptionCard
              label="Keep personal"
              description="Just between you and God. Only you can see it."
              selected={shareMode === 'personal'}
              onPress={() => {
                setShareMode('personal');
                setSelectedGroupId(null);
                setCreatorKeepsPersonal(true);
                setError(null);
              }}
            />
            <OptionCard
              label="Share with a group"
              description="Pray together. Members see it on their Today list."
              selected={shareMode === 'group'}
              onPress={() => {
                setShareMode('group');
                setError(null);
              }}
            />
            {shareMode === 'group' ? (
              <Animated.View entering={FadeIn.duration(220)} style={styles.reveal}>
                {groupsLoaded ? (
                  <ShareWithGroupPicker
                    groups={myGroups}
                    value={selectedGroupId}
                    onChange={(groupId) => {
                      setSelectedGroupId(groupId);
                      setError(null);
                    }}
                    showVisibility={false}
                    onGroupCreated={(group) => {
                      setMyGroups((prev) =>
                        prev.some((item) => item.id === group.id) ? prev : [group, ...prev],
                      );
                    }}
                  />
                ) : (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color={theme.colors.accent} />
                    <AppText muted>Loading your groups…</AppText>
                  </View>
                )}
              </Animated.View>
            ) : null}
          </View>
        );

      case 'visibility':
        return (
          <View style={styles.stepBody}>
            <SelectField
              placeholder="Choose who sees it"
              sheetTitle="Who should see this prayer?"
              options={groupVisibilityOptions(selectedGroup?.name)}
              value={toGroupVisibility(creatorKeepsPersonal)}
              onChange={(next) => setCreatorKeepsPersonal(next === 'group_and_me')}
            />
          </View>
        );

      case 'schedule':
        return (
          <View style={styles.stepBody}>
            <SchedulePicker
              value={scheduleType}
              weekdays={weekdays}
              onChangeSchedule={(next) => {
                setScheduleType(next);
                setError(null);
              }}
              onChangeWeekdays={(days) => {
                setWeekdays(days);
                setError(null);
              }}
            />
            <ReminderTimesPicker value={reminders} onChange={setReminders} />
          </View>
        );

      case 'review':
        return (
          <View style={styles.stepBody}>
            <View style={styles.prayerCard}>
              <View style={styles.prayerCardHeader}>
                <AppText variant="label">Prayer</AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit prayer"
                  onPress={() => editFromReview('prayer')}
                  hitSlop={10}>
                  <AppText accent style={styles.editLink}>
                    Edit
                  </AppText>
                </Pressable>
              </View>
              <AppText variant="title">{title.trim()}</AppText>
              <AppText muted>{prayerPoint.trim()}</AppText>
              <AppText style={styles.prayerExcerpt} numberOfLines={6}>
                “{body.trim()}”
              </AppText>
              {scriptureRef.trim() ? (
                <AppText variant="bodySmall" accent style={styles.verseRef}>
                  {scriptureRef.trim()}
                </AppText>
              ) : null}
            </View>

            <View style={styles.summaryCard}>
              <ReviewRow
                label="Category"
                value={categoryLabel ?? 'No specific category'}
                onEdit={() => editFromReview('category')}
              />
              <ReviewRow
                label="Prayer location"
                value={shareMode === 'group' ? (selectedGroup?.name ?? 'Group') : 'Personal'}
                onEdit={isEditing ? undefined : () => editFromReview('location')}
                note={
                  isEditing && shareMode === 'personal'
                    ? 'To share with a group, use Share on the prayer page.'
                    : undefined
                }
              />
              <ReviewRow
                label="Visibility"
                value={
                  shareMode === 'group'
                    ? describeGroupVisibility(creatorKeepsPersonal, selectedGroup?.name)
                    : 'Only you'
                }
                onEdit={
                  isEditing
                    ? undefined
                    : () => editFromReview(shareMode === 'group' ? 'visibility' : 'location')
                }
              />
              <ReviewRow
                label="Recurrence"
                value={scheduleValue}
                note={scheduleOption?.description}
                onEdit={() => editFromReview('schedule')}
              />
              <ReviewRow
                label="Reminders"
                value={
                  activeReminders.length > 0
                    ? activeReminders.map((item) => formatReminderTimeLabel(item.time)).join(', ')
                    : 'No reminders'
                }
                note={pausedCount > 0 ? `${pausedCount} paused` : undefined}
                onEdit={() => editFromReview('schedule')}
                last
              />
            </View>
          </View>
        );
    }
  }

  if (initialLoading) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.accent} />
        <AppText muted>Loading prayer…</AppText>
      </View>
    );
  }

  const EnterAnimation = direction === 'forward' ? FadeInRight : FadeInLeft;

  return (
    <View
      ref={rootRef}
      style={[styles.root, { paddingTop: Math.max(insets.top, theme.spacing.sm) }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Close editor' : 'Close new prayer'}
          onPress={requestClose}
          hitSlop={12}
          style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}>
          <AppText style={styles.closeIcon}>✕</AppText>
        </Pressable>
        <StepProgress current={stepIndex} total={steps.length} />
        <View style={styles.topBarSpacer} />
      </View>

      <Animated.View key={step} entering={EnterAnimation.duration(220)} style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heading}>
            <AppText variant="greeting">{copy.title}</AppText>
            <AppText muted style={styles.subtitle}>
              {copy.subtitle}
            </AppText>
          </View>
          {renderStep()}
        </ScrollView>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: footerBottom }]}>
        {error ? (
          <AppText variant="bodySmall" style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
        <View style={styles.footerRow}>
          {stepIndex > 0 || returnToReview ? (
            <Button
              title="Back"
              variant="secondary"
              onPress={goBack}
              disabled={loading}
              style={styles.backButton}
            />
          ) : null}
          <Button
            title={primaryLabel}
            onPress={step === 'review' ? handleSave : goNext}
            loading={loading}
            disabled={aiLoading}
            style={styles.primaryButton}
          />
        </View>
      </View>

      <ConfirmDialog
        visible={confirmDiscard}
        title={isEditing ? 'Discard your changes?' : 'Discard this prayer?'}
        message={
          isEditing
            ? 'Your edits have not been saved yet.'
            : 'What you have written so far will not be saved.'
        }
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          close();
        }}
      />
    </View>
  );
}

type ScriptureSectionProps = {
  open: boolean;
  onOpen: () => void;
  onDone: () => void;
  reference: string;
  text: string;
  note: string | null;
  translationId: string | null;
  loading: boolean;
  onChangeReference: (value: string) => void;
  onChangeText: (value: string) => void;
  onSuggest: () => void;
  onLookUp: () => void;
  onClear: () => void;
};

function ScriptureSection({
  open,
  onOpen,
  onDone,
  reference,
  text,
  note,
  translationId,
  loading,
  onChangeReference,
  onChangeText,
  onSuggest,
  onLookUp,
  onClear,
}: ScriptureSectionProps) {
  const hasVerse = Boolean(reference.trim() || text.trim());

  if (!open && !hasVerse) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.addVerse, pressed && styles.pressed]}>
        <AppText accent style={styles.addVerseText}>
          ＋ Add a verse to stand on
        </AppText>
        <AppText variant="bodySmall" muted>
          Optional
        </AppText>
      </Pressable>
    );
  }

  if (!open) {
    return (
      <View style={styles.verseCard}>
        <View style={styles.verseCardHeader}>
          <AppText variant="label">Scripture</AppText>
          <View style={styles.verseCardActions}>
            <Pressable accessibilityRole="button" onPress={onOpen} hitSlop={8}>
              <AppText accent style={styles.editLink}>
                Change
              </AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8}>
              <AppText style={styles.removeLink}>Remove</AppText>
            </Pressable>
          </View>
        </View>
        {note ? (
          <AppText variant="bodySmall" style={styles.scriptureWarning}>
            {note} Tap Change to look up a verse, or remove it.
          </AppText>
        ) : null}
        {reference.trim() ? <AppText style={styles.verseCardRef}>{reference.trim()}</AppText> : null}
        {text.trim() ? (
          <AppText muted style={styles.verseCardText} numberOfLines={4}>
            {text.trim()}
          </AppText>
        ) : null}
        {translationId && text.trim() ? (
          <AppText variant="bodySmall" muted>
            {formatScriptureAttribution(translationId)}
          </AppText>
        ) : null}
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.verseEditor}>
      <AppText variant="label">Scripture to stand on</AppText>
      <AppText variant="bodySmall" muted>
        AI suggests a reference; PrayerCare loads the verse text from a trusted Bible source.
      </AppText>
      <Input
        label="Reference"
        value={reference}
        onChangeText={onChangeReference}
        placeholder="e.g. Philippians 4:6-7"
      />
      <TextArea
        label="Verse text"
        value={text}
        onChangeText={onChangeText}
        placeholder="Loaded from the Bible source, or type your own..."
        style={styles.shortArea}
      />
      <View style={styles.verseButtons}>
        <Button
          title="Suggest a verse"
          variant="secondary"
          loading={loading}
          onPress={onSuggest}
          style={styles.verseButton}
        />
        <Button
          title="Look up"
          variant="secondary"
          loading={loading}
          onPress={onLookUp}
          style={styles.verseButton}
        />
      </View>
      <View style={styles.verseButtons}>
        {hasVerse ? (
          <Button title="Remove verse" variant="ghost" onPress={onClear} style={styles.verseButton} />
        ) : null}
        <Button title="Done" variant="ghost" onPress={onDone} style={styles.verseButton} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closePressed: {
    backgroundColor: theme.colors.accentLight,
  },
  closeIcon: {
    fontSize: 16,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  topBarSpacer: {
    width: 40,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  heading: {
    gap: theme.spacing.sm,
  },
  subtitle: {
    lineHeight: 24,
  },
  stepBody: {
    gap: theme.spacing.md,
  },
  reveal: {
    marginTop: theme.spacing.sm,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  prayerArea: {
    minHeight: 160,
  },
  aiBanner: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.goldLight,
  },
  aiBannerTitle: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  aiBannerText: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  aiBannerAction: {
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  aiAssist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentLight,
  },
  aiAssistIcon: {
    fontSize: 20,
    color: theme.colors.accentDark,
    width: 24,
    textAlign: 'center',
  },
  aiAssistText: {
    flex: 1,
    gap: 2,
  },
  aiAssistTitle: {
    fontWeight: '600',
    color: theme.colors.accentDark,
  },
  pressed: {
    opacity: 0.85,
  },
  addVerse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  addVerseText: {
    fontWeight: '600',
  },
  verseCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.gold,
  },
  verseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verseCardActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  verseCardRef: {
    fontWeight: '600',
  },
  verseCardText: {
    lineHeight: 24,
    fontStyle: 'italic',
  },
  verseEditor: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  verseButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  verseButton: {
    flex: 1,
  },
  shortArea: {
    minHeight: 88,
  },
  scriptureWarning: {
    color: theme.colors.gold,
    lineHeight: 20,
  },
  prayerCard: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  prayerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayerExcerpt: {
    lineHeight: 26,
    marginTop: theme.spacing.xs,
  },
  verseRef: {
    fontWeight: '600',
  },
  summaryCard: {
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editLink: {
    fontWeight: '600',
    fontSize: 15,
  },
  removeLink: {
    fontWeight: '500',
    fontSize: 15,
    color: theme.colors.error,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  backButton: {
    minWidth: 104,
  },
  primaryButton: {
    flex: 1,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
