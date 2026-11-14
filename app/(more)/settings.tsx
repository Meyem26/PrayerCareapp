import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { LanguagePicker } from '@/components/i18n/LanguagePicker';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OptionCard } from '@/components/ui/OptionCard';
import { Screen } from '@/components/ui/Screen';
import {
  DEFAULT_BIBLE_TRANSLATION_ID,
  getAutoFetchTranslationsForLocale,
  isAutoFetchTranslation,
  resolveBibleTranslationForLocaleChange,
} from '@/constants/bible-translations';
import { LANGUAGE_OPTIONS, normalizeAppLocale, type AppLocale } from '@/constants/languages';
import { PRAISE_VISIBILITY_OPTIONS } from '@/constants/praise-visibility';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/api/history';
import { registerForPushNotifications } from '@/lib/notifications/register';
import { syncDailyDigestNotification } from '@/lib/notifications/schedule-reminders';
import { formatTimezoneLabel, getDeviceTimezone } from '@/lib/utils/timezone';

const REMINDER_TIMES = [
  { value: '07:00:00', label: '7:00 AM' },
  { value: '08:00:00', label: '8:00 AM' },
  { value: '09:00:00', label: '9:00 AM' },
  { value: '12:00:00', label: '12:00 PM' },
  { value: '18:00:00', label: '6:00 PM' },
  { value: '20:00:00', label: '8:00 PM' },
];

function formatReminderTime(time: string): string {
  return REMINDER_TIMES.find((item) => item.value.startsWith(time.slice(0, 5)))?.label ?? time;
}

export default function SettingsScreen() {
  const { profile, updateProfile, user } = useAuth();
  const { t } = useI18n();
  const [locale, setLocale] = useState<AppLocale>(normalizeAppLocale(profile?.locale));
  const [timezone, setTimezone] = useState(profile?.timezone ?? getDeviceTimezone());
  const [bibleTranslationId, setBibleTranslationId] = useState(
    profile?.bible_translation_id ?? DEFAULT_BIBLE_TRANSLATION_ID,
  );
  const [praiseVisibilityDays, setPraiseVisibilityDays] = useState(profile?.praise_visibility_days ?? 30);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00:00');
  const [careDueAlerts, setCareDueAlerts] = useState(true);
  const [groupInviteAlerts, setGroupInviteAlerts] = useState(true);
  const [weeklyEncouragement, setWeeklyEncouragement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const bibleOptions = useMemo(
    () => getAutoFetchTranslationsForLocale(locale),
    [locale],
  );

  useEffect(() => {
    if (profile?.locale) setLocale(normalizeAppLocale(profile.locale));
    if (profile?.timezone) setTimezone(profile.timezone);
    if (profile?.bible_translation_id) {
      setBibleTranslationId(
        isAutoFetchTranslation(profile.bible_translation_id)
          ? profile.bible_translation_id
          : DEFAULT_BIBLE_TRANSLATION_ID,
      );
    }
    if (profile?.praise_visibility_days) setPraiseVisibilityDays(profile.praise_visibility_days);
  }, [profile]);

  useEffect(() => {
    fetchNotificationPreferences().then(({ data }) => {
      if (!data) return;
      setDailyReminder(data.daily_prayer_reminder);
      setReminderTime(data.daily_reminder_time);
      setCareDueAlerts(data.care_action_due);
      setGroupInviteAlerts(data.group_invites);
      setWeeklyEncouragement(data.weekly_encouragement);
    });
  }, []);

  function handleLocaleChange(next: AppLocale) {
    setLocale(next);
    const resolved = resolveBibleTranslationForLocaleChange(bibleTranslationId, next);
    if (resolved.changed) {
      setBibleTranslationId(resolved.translationId);
      const languageName =
        LANGUAGE_OPTIONS.find((item) => item.code === next)?.nativeName ?? next;
      setMessage(t('language.bibleUpdated', { language: languageName }));
    }
  }

  async function handleSave() {
    setMessage(null);
    setError(null);
    setLoading(true);

    const resolvedBible = resolveBibleTranslationForLocaleChange(bibleTranslationId, locale);

    const [profileResult, notifResult] = await Promise.all([
      updateProfile({
        locale,
        timezone,
        bible_translation_id: resolvedBible.translationId,
        praise_visibility_days: praiseVisibilityDays,
      }),
      updateNotificationPreferences({
        daily_prayer_reminder: dailyReminder,
        daily_reminder_time: reminderTime,
        care_action_due: careDueAlerts,
        group_invites: groupInviteAlerts,
        weekly_encouragement: weeklyEncouragement,
      }),
    ]);

    setLoading(false);

    if (profileResult.error || notifResult.error) {
      setError(profileResult.error ?? notifResult.error);
      return;
    }

    if (resolvedBible.changed) {
      setBibleTranslationId(resolvedBible.translationId);
    }

    setMessage(t('settings.saved'));

    const wantsPush =
      dailyReminder || careDueAlerts || groupInviteAlerts || weeklyEncouragement;
    if (wantsPush && user?.id) {
      await registerForPushNotifications(user.id);
    }

    const digestResult = await syncDailyDigestNotification(dailyReminder, reminderTime);
    if (digestResult.error) {
      setError(digestResult.error);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <AppText variant="label">{t('language.label')}</AppText>
          <AppText variant="bodySmall" muted>
            {t('language.settingsHint')}
          </AppText>
          <LanguagePicker value={locale} onChange={handleLocaleChange} />
        </View>

        <View style={styles.section}>
          <AppText variant="label">{t('settings.timezone')}</AppText>
          <OptionCard
            label={formatTimezoneLabel(timezone)}
            description={t('settings.timezoneHint')}
            selected
            onPress={() => setTimezone(getDeviceTimezone())}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="label">{t('settings.bibleTranslation')}</AppText>
          <AppText variant="bodySmall" muted>
            {t('settings.bibleHint')}
          </AppText>
          <View style={styles.options}>
            {bibleOptions.map((translation) => (
              <OptionCard
                key={translation.id}
                label={translation.label}
                description={translation.description}
                selected={bibleTranslationId === translation.id}
                onPress={() => setBibleTranslationId(translation.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="label">{t('settings.praiseVisibility')}</AppText>
          <AppText variant="bodySmall" muted>
            {t('settings.praiseHint')}
          </AppText>
          <View style={styles.options}>
            {PRAISE_VISIBILITY_OPTIONS.map((option) => (
              <OptionCard
                key={option.days}
                label={option.label}
                description={option.description}
                selected={praiseVisibilityDays === option.days}
                onPress={() => setPraiseVisibilityDays(option.days)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="label">{t('settings.notifications')}</AppText>
          <AppText variant="bodySmall" muted>
            {t('settings.notificationsHint')}
          </AppText>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText>{t('settings.dailyReminder')}</AppText>
              <AppText variant="bodySmall" muted>
                {t('settings.dailyReminderHint')}
              </AppText>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={setDailyReminder}
              trackColor={{ false: theme.colors.border, true: theme.colors.accentLight }}
              thumbColor={dailyReminder ? theme.colors.accent : theme.colors.surface}
            />
          </View>

          {dailyReminder ? (
            <View style={styles.options}>
              {REMINDER_TIMES.map((item) => (
                <OptionCard
                  key={item.value}
                  label={item.label}
                  selected={reminderTime.startsWith(item.value.slice(0, 5))}
                  onPress={() => setReminderTime(item.value)}
                />
              ))}
            </View>
          ) : (
            <AppText variant="bodySmall" muted>
              {t('settings.reminderTime', { time: formatReminderTime(reminderTime) })}
            </AppText>
          )}

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText>{t('settings.careReminders')}</AppText>
              <AppText variant="bodySmall" muted>
                {t('settings.careRemindersHint')}
              </AppText>
            </View>
            <Switch
              value={careDueAlerts}
              onValueChange={setCareDueAlerts}
              trackColor={{ false: theme.colors.border, true: theme.colors.accentLight }}
              thumbColor={careDueAlerts ? theme.colors.accent : theme.colors.surface}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText>{t('settings.groupInvites')}</AppText>
            </View>
            <Switch
              value={groupInviteAlerts}
              onValueChange={setGroupInviteAlerts}
              trackColor={{ false: theme.colors.border, true: theme.colors.accentLight }}
              thumbColor={groupInviteAlerts ? theme.colors.accent : theme.colors.surface}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText>{t('settings.weeklyEncouragement')}</AppText>
              <AppText variant="bodySmall" muted>
                {t('settings.weeklyEncouragementHint')}
              </AppText>
            </View>
            <Switch
              value={weeklyEncouragement}
              onValueChange={setWeeklyEncouragement}
              trackColor={{ false: theme.colors.border, true: theme.colors.accentLight }}
              thumbColor={weeklyEncouragement ? theme.colors.accent : theme.colors.surface}
            />
          </View>
        </View>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {message ? <AppText style={styles.success}>{message}</AppText> : null}

        <Button title={t('settings.save')} loading={loading} onPress={handleSave} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    gap: theme.spacing.sm,
  },
  options: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  error: {
    color: theme.colors.error,
  },
  success: {
    color: theme.colors.accent,
  },
});
