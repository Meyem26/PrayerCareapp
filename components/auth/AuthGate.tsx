import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { LoadingScreen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';

export function AuthGate({ children }: PropsWithChildren) {
  const { session, isLoading, isProfileLoading, isEmailVerified, needsOnboarding } = useAuth();

  if (isLoading || isProfileLoading) {
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

  return children;
}
