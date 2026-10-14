import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '../ui/Text';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import Icon from '../ui/Icon';
import { useAuthStore } from '../../data/auth';

/**
 * The 6-digit code from the verification email, typed in here, and a way to send a new one.
 * The email's link verifies too, but it opens the website; the code works in the app.
 */
export const VerifyEmailCode = ({ email, onVerified }: { email: string; onVerified?: () => void }) => {
  const verifyEmailCode = useAuthStore((s) => s.verifyEmailCode);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'verify' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const digits = code.replace(/\D/g, '');

  const verify = async () => {
    if (digits.length !== 6 || busy) return;
    setBusy('verify');
    setError(null);
    try {
      await verifyEmailCode(digits);
      onVerified?.();
    } catch (e: any) {
      setError(e?.message || 'Could not verify the code');
    } finally {
      setBusy(null);
    }
  };

  const sendNew = async () => {
    setBusy('send');
    setError(null);
    try {
      await resendVerification();
      setCode('');
      setSent(true);
    } catch (e: any) {
      setError(e?.message || 'Could not send the email');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-2.5">
        <Field
          icon={<Icon name="check" size={18} color="#7E7E8C" />}
          className="flex-1"
          value={code}
          onChangeText={(t) => {
            setCode(t.replace(/[^\d\s]/g, '').slice(0, 7));
            setError(null);
          }}
          placeholder="6-digit code"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          returnKeyType="done"
          onSubmitEditing={verify}
          accessibilityLabel="Verification code"
        />
        <Button variant="accent" size="md" onPress={verify} disabled={digits.length !== 6 || busy !== null}>
          {busy === 'verify' ? <ActivityIndicator color="#000000" /> : 'Verify'}
        </Button>
      </View>
      {error ? (
        <Text className="text-red text-bs" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : sent ? (
        <Text className="text-t2 text-bs" accessibilityLiveRegion="polite">
          A new code is on its way to {email}. Only the newest one works.
        </Text>
      ) : null}
      <Pressable
        onPress={sendNew}
        disabled={busy !== null}
        className="self-start py-1"
        accessibilityRole="button"
        accessibilityLabel="Send a new code"
      >
        <Text className="text-acc text-bs font-medium">{busy === 'send' ? 'Sending…' : 'Send a new code'}</Text>
      </Pressable>
    </View>
  );
};
