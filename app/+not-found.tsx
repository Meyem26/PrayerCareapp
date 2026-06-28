import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerShown: true }} />
      <Screen centered>
        <View style={styles.content}>
          <AppText variant="title">This screen is not available</AppText>
          <AppText muted style={styles.body}>
            The page you were looking for could not be found.
          </AppText>
          <Link href="/" asChild>
            <Button title="Go to Today" />
          </Link>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: theme.spacing.lg,
    alignItems: 'stretch',
  },
  body: {
    textAlign: 'center',
  },
});
