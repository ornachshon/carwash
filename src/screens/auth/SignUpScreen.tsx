import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthTextInput } from '../../components/AuthTextInput';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage, mapAuthError } from '../../utils/authErrors';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    setError(null);
    setSuccess(null);

    if (!fullName.trim() || !phone.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email.trim(), password, fullName.trim(), phone.trim());
      setSuccess('Account created. Check your email to confirm, then sign in.');
    } catch (err) {
      const raw = getErrorMessage(err);
      console.error('[SignUpScreen] signUp failed:', raw, err);
      setError(mapAuthError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenLayout
      title="Create account"
      subtitle="Join CarWash — you'll pick your role next"
      scroll
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.form}
      >
        <AuthTextInput
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          textContentType="name"
          autoComplete="name"
        />
        <AuthTextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
        <AuthTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />
        <AuthTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
        />
        {error ? <Text style={styles.formError}>{error}</Text> : null}
        {success ? <Text style={styles.formSuccess}>{success}</Text> : null}
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
  },
  formError: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
  formSuccess: {
    ...typography.bodySmall,
    color: colors.success,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  link: {
    alignItems: 'center',
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
  },
});
