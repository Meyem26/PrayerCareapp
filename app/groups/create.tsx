import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { createGroup } from '@/lib/api/groups';

export default function CreateGroupScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);

    if (!name.trim()) {
      setError('Please enter a group name.');
      return;
    }

    setLoading(true);
    const { data, error: createError } = await createGroup(name, description);
    setLoading(false);

    if (createError || !data) {
      setError(createError ?? 'Could not create group.');
      return;
    }

    router.replace({ pathname: '/groups/[id]', params: { id: data.id } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText muted>
          Groups are private. Only people you invite can join and see shared prayers.
        </AppText>
        <Input label="Group name" value={name} onChangeText={setName} placeholder="Women's Ministry, Care Team..." />
        <TextArea
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="What is this group for?"
          style={styles.shortArea}
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button title="Create Group" loading={loading} onPress={handleCreate} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  shortArea: {
    minHeight: 88,
  },
  error: {
    color: theme.colors.error,
    textAlign: 'center',
  },
});
