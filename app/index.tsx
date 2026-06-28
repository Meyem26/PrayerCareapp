import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { session, isLoading, isProfileLoading, isEmailVerified, needsOnboarding } = useAuth();

  if (isLoading || (session && isProfileLoading)) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isEmailVerified) {
    return <Redirect href="/(auth)/verify-email" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
