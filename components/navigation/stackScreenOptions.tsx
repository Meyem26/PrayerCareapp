import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { HeaderBackButton } from '@/components/navigation/HeaderBackButton';
import { theme } from '@/constants/theme';

type ScreenOptionsProp = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;
type StackOptions = Exclude<ScreenOptionsProp, (...args: never[]) => unknown>;

type ScreenOptionsArgs = {
  route: { key: string };
  navigation: { getState: () => { routes: { key: string }[] } | undefined };
};

const baseOptions: StackOptions = {
  headerStyle: { backgroundColor: theme.colors.background },
  headerTitleStyle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  headerTintColor: theme.colors.accent,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.colors.background },
};

/** Shared header styling for nested stacks, with a guaranteed way back from their first screen. */
export function stackScreenOptions(extra: StackOptions = {}) {
  return ({ route, navigation }: ScreenOptionsArgs): StackOptions => {
    const isFirstInStack = navigation.getState()?.routes[0]?.key === route.key;
    if (!isFirstInStack) return { ...baseOptions, ...extra };
    return {
      ...baseOptions,
      ...extra,
      headerLeft: ({ tintColor }) => (
        <HeaderBackButton tintColor={typeof tintColor === 'string' ? tintColor : undefined} />
      ),
    };
  };
}
