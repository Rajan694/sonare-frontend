import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '../ui/Text';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import Icon from '../ui/Icon';
import { AuthError, useAuthStore } from '../../data/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'email' | 'code' | 'password';

const messageOf = (e: unknown, fallback: string): string => {
  const message = e instanceof Error ? e.message : '';
  if (message === 'Network request failed') return "Can't reach the Sonare server";
  return message || fallback;
};

/**
 * Forgot password, all in the app: the email gets a 6-digit code, the code is checked here, and
 * then the new password is set. `onDone` gets the email back so sign-in can be filled in.
 */
export const ForgotPassword = ({ initialEmail, onDone }: { initialEmail: string; onDone: (email: string) => void }) => {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const verifyResetCode = useAuthStore((s) => s.verifyResetCode);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState<'send' | 'verify' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const address = email.trim().toLowerCase();
  const digits = code.replace(/\D/g, '');

  const sendCode = async (again = false) => {
    if (!EMAIL_RE.test(address)) {
      setError('Enter a valid email address');
      return;
    }
    setBusy('send');
    setError(null);
    try {
      await requestPasswordReset(address);
      setCode('');
      setResent(again);
      setStep('code');
    } catch (e) {
      setError(messageOf(e, 'Could not send the email'));
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (digits.length !== 6 || busy) return;
    setBusy('verify');
    setError(null);
    try {
      setResetToken(await verifyResetCode(address, digits));
      setStep('password');
    } catch (e) {
      setError(messageOf(e, 'Could not check the code'));
    } finally {
      setBusy(null);
    }
  };

  // The confirm field submits its own text: state can lag the last keystrokes.
  const save = async (typedConfirm: string = confirm) => {
    if (password.length < 8) {
      setError('Use at least 8 characters for your password');
      return;
    }
    if (typedConfirm !== password) {
      setError("The passwords don't match");
      return;
    }
    setBusy('save');
    setError(null);
    try {
      await resetPassword(resetToken, password);
      onDone(address);
    } catch (e) {
      if (e instanceof AuthError && e.code === 'INVALID_TOKEN') {
        // The 15 minutes after the code ran out: start again with a new code.
        setStep('email');
        setError('That took too long. Ask for a new code.');
      } else {
        setError(messageOf(e, 'Could not set the password'));
      }
    } finally {
      setBusy(null);
    }
  };

  const errorText = error && (
    <Text className="text-red text-bm mt-3" accessibilityLiveRegion="polite">
      {error}
    </Text>
  );

  if (step === 'email') {
    return (
      <View>
        <Field
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={() => sendCode()}
          accessibilityLabel="Email"
        />
        {errorText}
        <Button
          variant="accent"
          size="lg"
          onPress={() => sendCode()}
          disabled={busy !== null}
          className="mt-6"
          accessibilityLabel="Send code"
        >
          {busy === 'send' ? <ActivityIndicator color="#000000" /> : 'Send code'}
        </Button>
      </View>
    );
  }

  if (step === 'code') {
    return (
      <View>
        <Text className="text-t2 text-bm mb-4">
          {resent
            ? `A new code is on its way to ${address}. Only the newest one works.`
            : `If an account exists for ${address}, a 6-digit code is on its way. It works for 30 minutes.`}
        </Text>
        <Field
          icon={<Icon name="check" size={18} color="#7E7E8C" />}
          value={code}
          onChangeText={(t) => {
            setCode(t.replace(/[^\d\s]/g, '').slice(0, 7));
            setError(null);
          }}
          placeholder="6-digit code"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          returnKeyType="go"
          onSubmitEditing={verify}
          accessibilityLabel="Reset code"
        />
        {errorText}
        <Button
          variant="accent"
          size="lg"
          onPress={verify}
          disabled={digits.length !== 6 || busy !== null}
          className="mt-6"
          accessibilityLabel="Check code"
        >
          {busy === 'verify' ? <ActivityIndicator color="#000000" /> : 'Check code'}
        </Button>
        <View className="flex-row justify-between mt-4">
          <Pressable
            onPress={() => sendCode(true)}
            disabled={busy !== null}
            className="py-1"
            accessibilityRole="button"
            accessibilityLabel="Send a new code"
          >
            <Text className="text-acc text-bs font-medium">{busy === 'send' ? 'Sending…' : 'Send a new code'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setStep('email');
              setError(null);
            }}
            className="py-1"
            accessibilityRole="button"
          >
            <Text className="text-t2 text-bs">Use another email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text className="text-t2 text-bm mb-4">Choose a new password for {address}.</Text>
      <View className="gap-3">
        <Field
          placeholder="New password (8+ characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          accessibilityLabel="New password"
        />
        <Field
          placeholder="New password again"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={(e) => save(e.nativeEvent.text)}
          accessibilityLabel="Repeat new password"
        />
      </View>
      {errorText}
      <Button
        variant="accent"
        size="lg"
        onPress={() => save()}
        disabled={busy !== null}
        className="mt-6"
        accessibilityLabel="Set new password"
      >
        {busy === 'save' ? <ActivityIndicator color="#000000" /> : 'Set new password'}
      </Button>
    </View>
  );
};
