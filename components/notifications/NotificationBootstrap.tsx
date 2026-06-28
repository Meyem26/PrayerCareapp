import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { fetchNotificationPreferences } from '@/lib/api/history';
import { registerForPushNotifications } from '@/lib/notifications/register';

export function NotificationBootstrap() {
  const { user, needsOnboarding, isEmailVerified } = useAuth();

  useEffect(() => {
    if (!user?.id || needsOnboarding || !isEmailVerified) return;

    fetchNotificationPreferences().then(({ data }) => {
      const wantsAnyNotification =
        data?.daily_prayer_reminder ||
        data?.care_action_due ||
        data?.group_invites ||
        data?.weekly_encouragement;

      if (wantsAnyNotification) {
        registerForPushNotifications(user.id);
      }
    });
  }, [user?.id, needsOnboarding, isEmailVerified]);

  return null;
}
