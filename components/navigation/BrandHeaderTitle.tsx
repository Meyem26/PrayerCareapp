import { Image, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';

type BrandHeaderTitleProps = {
  title: string;
};

const isWeb = Platform.OS === 'web';

/** Upper-left brand: flame mark + PrayerCare, with the screen name as a quiet line. */
export function BrandHeaderTitle({ title }: BrandHeaderTitleProps) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="header"
      accessibilityLabel={`PrayerCare, ${title}`}>
      <Image
        source={require('@/assets/images/brand-mark.png')}
        style={styles.mark}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.textCol}>
        <AppText style={styles.brand}>PrayerCare</AppText>
        <AppText style={styles.title}>{title}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isWeb ? 8 : 10,
    paddingVertical: 2,
  },
  mark: {
    width: isWeb ? 30 : 36,
    height: isWeb ? 30 : 36,
  },
  textCol: {
    justifyContent: 'center',
    gap: 1,
  },
  brand: {
    fontSize: isWeb ? 16 : 17,
    lineHeight: isWeb ? 20 : 22,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: theme.colors.accentDark,
    letterSpacing: 0.4,
  },
});
