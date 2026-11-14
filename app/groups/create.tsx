import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { TextArea } from '@/components/ui/TextArea';
import { theme } from '@/constants/theme';
import { useI18n } from '@/contexts/I18nContext';
import { createGroup } from '@/lib/api/groups';

export default function CreateGroupScreen() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);

    if (!name.trim()) {
      setError(t('groups.needName'));
      return;
    }

    setLoading(true);
    const { data, error: createError } = await createGroup(name, description);
    setLoading(false);

    if (createError || !data) {
      setError(createError ?? t('groups.createFailed'));
      return;
    }

    router.replace({ pathname: '/groups/[id]', params: { id: data.id } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText muted>{t('groups.createHint')}</AppText>
        <Input
          label={t('groups.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('groups.namePlaceholder')}
        />
        <TextArea
          label={t('groups.descLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('groups.descPlaceholder')}
          style={styles.shortArea}
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button title={t('groups.createAction')} loading={loading} onPress={handleCreate} />
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
