import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '../components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { IconButton } from '../components/ui/IconButton';
import { clearPendingAction } from '../data/accountGate';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { BrandMark } from '../components/ui/BrandMark';
import { useAuthStore } from '../data/auth';

type Mode = 'signin' | 'signup' | 'forgot';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign in, create an account, or ask for a password reset link (the link opens the web app). Opened from Settings, or by the account gate when a guest
 * tries something that saves to their account — then `reason` says why, and what they were
 * doing resumes once they're in (RootNavigator runs it).
 */
export const SignInScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const params = useRoute<any>().params as { reason?: string; mode?: 'signin' | 'signup' } | undefined;
  const reason = params?.reason;
  const succeeded = useRef(false);

  // Leaving without signing in (close, back gesture) abandons the guest's pending action.
  useEffect(
    () => () => {
      if (!succeeded.current) clearPendingAction();
    },
    [],
  );

  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  // A gate-triggered visit is usually a new listener: open on "Create account".
  const [mode, setMode] = useState<Mode>(params?.mode ?? (reason ? 'signup' : 'signin'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';

  const validate = (candidate: string): string | null => {
    if (isSignUp && !name.trim()) return 'Tell us what to call you';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
    if (isForgot) return null;
    if (isSignUp && candidate.length < 8) return 'Use at least 8 characters for your password';
    if (!candidate) return 'Enter your password';
    return null;
  };

  // The password field submits its own text: state can lag the last keystrokes.
  const submit = async (typedPassword: string = password) => {
    const problem = validate(typedPassword);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isForgot) {
        await requestPasswordReset(email.trim().toLowerCase());
        setResetSent(true);
        return;
      }
      succeeded.current = true;
      if (isSignUp) await signUp(email.trim().toLowerCase(), typedPassword, name.trim());
      else await signIn(email.trim().toLowerCase(), typedPassword);
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e: any) {
      succeeded.current = false;
      setError(
        e?.message === 'Network request failed'
          ? "Can't reach the Sonare server"
          : e?.message || 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  const title = isForgot ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back';
  const subtitle = isForgot
    ? "Enter your account's email and we'll send a link to set a new password."
    : (reason ??
      (isSignUp
        ? 'Your favourites, playlists and history are saved to your account and follow you to every device.'
        : 'Sign in to pick up your favourites, playlists and history.'));
  const submitLabel = isForgot ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in';

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View className="px-3 h-[48px] flex-row items-center">
        {navigation.canGoBack() && (
          <IconButton
            icon={<Icon name="chevron-down" size={22} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Keep listening without an account"
          />
        )}
      </View>
      <View className="px-6 flex-1 pt-4">
        <View className="mb-6">
          <BrandMark size={56} />
        </View>
        <Text className="text-h1 font-semibold text-t1 mb-2">{title}</Text>
        <Text className="text-t2 text-bm mb-8">{subtitle}</Text>

        <View className="gap-3">
          {isSignUp && (
            <Field
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              accessibilityLabel="Your name"
            />
          )}
          <Field
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType={isForgot ? 'go' : 'next'}
            onSubmitEditing={isForgot ? () => submit() : undefined}
            accessibilityLabel="Email"
          />
          {!isForgot && (
            <Field
              placeholder={isSignUp ? 'Password (8+ characters)' : 'Password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={(e) => submit(e.nativeEvent.text)}
              accessibilityLabel="Password"
            />
          )}
        </View>

        {mode === 'signin' && (
          <Pressable onPress={() => switchMode('forgot')} className="mt-3 self-end py-1" accessibilityRole="button">
            <Text className="text-t2 text-bs">Forgot password?</Text>
          </Pressable>
        )}

        {error && (
          <Text className="text-red text-bm mt-3" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        {resetSent && (
          <Text className="text-t2 text-bm mt-3" accessibilityLiveRegion="polite">
            If an account exists for {email.trim()}, a reset link is on its way. Open it within an hour to set a new
            password.
          </Text>
        )}

        <Button
          variant="accent"
          size="lg"
          onPress={() => submit()}
          disabled={busy}
          className="mt-6"
          accessibilityLabel={submitLabel}
        >
          {busy ? <ActivityIndicator color="#000000" /> : submitLabel}
        </Button>

        <Pressable
          onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-6 py-2 items-center"
          accessibilityRole="button"
        >
          <Text className="text-t2 text-bm">
            {mode === 'signin' ? 'New to Sonare? ' : 'Already have an account? '}
            <Text className="text-acc font-medium">{mode === 'signin' ? 'Create an account' : 'Sign in'}</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};
