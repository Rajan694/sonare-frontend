import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { IconButton } from '../components/ui/IconButton';
import { clearPendingAction } from '../data/accountGate';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { useAuthStore } from '../data/auth';

type Mode = 'signin' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign in or create an account. Opened from Settings, or by the account gate when a guest
 * tries something that saves to their account — then `reason` says why, and what they were
 * doing resumes once they're in (RootNavigator runs it).
 */
export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const params = useRoute<any>().params as { reason?: string; mode?: Mode } | undefined;
  const reason = params?.reason;
  const succeeded = useRef(false);

  // Leaving without signing in (close, back gesture) abandons the guest's pending action.
  useEffect(() => () => {
    if (!succeeded.current) clearPendingAction();
  }, []);

  const signIn = useAuthStore(s => s.signIn);
  const signUp = useAuthStore(s => s.signUp);
  // A gate-triggered visit is usually a new listener: open on "Create account".
  const [mode, setMode] = useState<Mode>(params?.mode ?? (reason ? 'signup' : 'signin'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  const validate = (password: string): string | null => {
    if (isSignUp && !name.trim()) return 'Tell us what to call you';
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
    if (isSignUp && password.length < 8) return 'Use at least 8 characters for your password';
    if (!password) return 'Enter your password';
    return null;
  };

  // The password field submits its own text: state can lag the last keystrokes.
  const submit = async (typedPassword: string = password) => {
    const password = typedPassword;
    const problem = validate(password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      succeeded.current = true;
      if (isSignUp) await signUp(email.trim().toLowerCase(), password, name.trim());
      else await signIn(email.trim().toLowerCase(), password);
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e: any) {
      succeeded.current = false;
      setError(e?.message === 'Network request failed' ? "Can't reach the Sonare server" : e?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isSignUp ? 'signin' : 'signup');
    setError(null);
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
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
        <View className="w-14 h-14 rounded-2xl bg-acc items-center justify-center mb-6">
          <Icon name="music" size={28} color="#000000" strokeWidth={2} />
        </View>
        <Text className="text-h1 font-semibold text-t1 mb-2">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </Text>
        <Text className="text-t2 text-bm mb-8">
          {reason ??
            (isSignUp
              ? 'Your favourites, playlists and history are saved to your account and follow you to every device.'
              : 'Sign in to pick up your favourites, playlists and history.')}
        </Text>

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
            returnKeyType="next"
            accessibilityLabel="Email"
          />
          <Field
            placeholder={isSignUp ? 'Password (8+ characters)' : 'Password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            textContentType={isSignUp ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={e => submit(e.nativeEvent.text)}
            accessibilityLabel="Password"
          />
        </View>

        {error && (
          <Text className="text-red text-bm mt-3" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <Button variant="accent" size="lg" onPress={() => submit()} disabled={busy} className="mt-6" accessibilityLabel={isSignUp ? 'Create account' : 'Sign in'}>
          {busy ? <ActivityIndicator color="#000000" /> : isSignUp ? 'Create account' : 'Sign in'}
        </Button>

        <Pressable onPress={switchMode} className="mt-6 py-2 items-center" accessibilityRole="button">
          <Text className="text-t2 text-bm">
            {isSignUp ? 'Already have an account? ' : 'New to Sonare? '}
            <Text className="text-acc font-medium">{isSignUp ? 'Sign in' : 'Create an account'}</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
