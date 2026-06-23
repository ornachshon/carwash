import { SafeAreaView, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface ScreenLayoutProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export function ScreenLayout({ title, subtitle, children, scroll = false, style }: ScreenLayoutProps) {
  const content = (
    <View style={[styles.content, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{content}</ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});
