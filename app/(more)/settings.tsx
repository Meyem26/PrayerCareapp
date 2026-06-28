import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OptionCard } from '@/components/ui/OptionCard';
import { Screen } from '@/components/ui/Screen';
import { AUTO_FETCH_BIBLE_TRANSLATIONS, DEFAULT_BIBLE_TRANSLATION_ID, isAutoFetchTranslation } from '@/constants/bible-translations';
import { PRAISE_VISIBILITY_OPTIONS } from '@/constants/praise-visibility';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/api/history';
import { registerForPushNotifications } from '@/lib/notifications/register';
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

  useEffect(() => {
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

  async function handleSave() {
    setMessage(null);
    setError(null);
    setLoading(true);

    const [profileResult, notifResult] = await Promise.all([
      updateProfile({
        timezone,
        bible_translation_id: bibleTranslationId,
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

    setMessage('Settings saved.');

    const wantsPush =
      dailyReminder || careDueAlerts || groupInviteAlerts || weeklyEncouragement;
    if (wantsPush && user?.id) {
      await registerForPushNotifications(user.id);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <AppText variant="label">Timezone</AppText>
          <OptionCard
            label={formatTimezoneLabel(timezone)}
            description="Tap to use your device timezone."
            selected
            onPress={() => setTimezone(getDeviceTimezone())}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="label">Bible translation (auto-fetch)</AppText>
          <AppText variant="bodySmall" muted>
            Used when sermon notes or other features look up verses. Public domain — no API key
            required.
          </AppText>
          <View style={styles.options}>
            {AUTO_FETCH_BIBLE_TRANSLATIONS.map((translation) => (
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
          <AppText variant="label">Praise visibility</AppText>
          <AppText variant="bodySmall" muted>
            How long answered prayers stay in Praise before moving to History.
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
          <AppText variant="label">Notifications</AppText>
          <AppText variant="bodySmall" muted>
            Preferences are saved now. On a physical device, allow notifications when prompted.
            Scheduled delivery will use your saved push token.
          </AppText>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText>Daily prayer reminder</AppText>
              <AppText variant="bodySmall" muted>
                A gentle nudge to open Today
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
              Reminder time: {formatReminderTime(reminderTime)}
            </AppText>
          )}

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText>Care action reminders</AppText>
              <AppText variant="bodySmall" muted>
                When someone is assigned to care
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
              <AppText>Group invites</AppText>
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
              <AppText>Weekly encouragement</AppText>
              <AppText variant="bodySmall" muted>
                A short summary of your prayer week
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

        <Button title="Save Settings" loading={loading} onPress={handleSave} />
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
