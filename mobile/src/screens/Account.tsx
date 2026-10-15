import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../components/ui/Text';
import { Screen } from '../components/layout/Screen';
import { Header } from '../components/layout/Header';
import { IconButton } from '../components/ui/IconButton';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { useAuthStore } from '../data/auth';

const messageOf = (e: unknown, fallback: string): string => {
  const message = e instanceof Error ? e.message : '';
  if (message === 'Network request failed') return "Can't reach the Sonare server";
  return message || fallback;
};

/** One saved/failed line under a form. */
const Status = ({ error, done }: { error: string | null; done: string | null }) =>
  error ? (
    <Text className="text-red text-bs" accessibilityLiveRegion="polite">
      {error}
    </Text>
  ) : done ? (
    <Text className="text-acc text-bs" accessibilityLiveRegion="polite">
      {done}
    </Text>
  ) : null;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="gap-2">
    <Text className="text-ov font-semibold text-t3 uppercase pl-1">{title}</Text>
    <View className="bg-s1 border border-ln rounded-lg p-3.5 gap-3">{children}</View>
  </View>
);

const NameSection = () => {
  const user = useAuthStore((s) => s.user);
  const updateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const [name, setName] = useState(user?.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const trimmed = name.trim();
  const changed = trimmed !== (user?.displayName ?? '');

  const save = async () => {
    if (!trimmed || !changed || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await updateDisplayName(trimmed);
      setDone('Saved');
    } catch (e) {
      setError(messageOf(e, 'Could not save the name'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Name">
      <Field
        value={name}
        onChangeText={(t) => {
          setName(t);
          setDone(null);
          setError(null);
        }}
        placeholder="Your name"
        autoCapitalize="words"
        autoComplete="name"
        maxLength={100}
        returnKeyType="done"
        onSubmitEditing={save}
        accessibilityLabel="Your name"
      />
      <Status error={error} done={done} />
      <Button variant="solid" size="sm" className="self-start" onPress={save} disabled={!trimmed || !changed || busy}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : 'Save name'}
      </Button>
    </Section>
  );
};

const PasswordSection = () => {
  const changePassword = useAuthStore((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // The last field submits its own text: state can lag the last keystrokes.
  const save = async (typedConfirm: string = confirm) => {
    if (busy) return;
    setDone(null);
    if (!current) return setError('Enter your current password');
    if (next.length < 8) return setError('Use at least 8 characters for the new password');
    if (typedConfirm !== next) return setError("The new passwords don't match");
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone('Password changed. Your other devices are signed out.');
    } catch (e) {
      setError(messageOf(e, 'Could not change the password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Password">
      <Field
        value={current}
        onChangeText={setCurrent}
        placeholder="Current password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        accessibilityLabel="Current password"
      />
      <Field
        value={next}
        onChangeText={setNext}
        placeholder="New password (8+ characters)"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        accessibilityLabel="New password"
      />
      <Field
        value={confirm}
        onChangeText={setConfirm}
        placeholder="New password again"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={(e) => save(e.nativeEvent.text)}
        accessibilityLabel="Repeat new password"
      />
      <Status error={error} done={done} />
      <Button variant="solid" size="sm" className="self-start" onPress={() => save()} disabled={busy}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : 'Change password'}
      </Button>
    </Section>
  );
};

const DeleteSection = () => {
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
    } catch (e) {
      setError(messageOf(e, 'Could not delete the account'));
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!password) return setError('Enter your password to delete the account');
    Alert.alert(
      'Delete your account?',
      "Your favourites, playlists, history and settings are deleted for good. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void remove() },
      ],
    );
  };

  return (
    <Section title="Delete account">
      <Text className="text-bs text-t3">
        Deletes your account and everything saved to it. Songs downloaded to this phone stay, and you can keep listening
        as a guest.
      </Text>
      <Field
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setError(null);
        }}
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        accessibilityLabel="Password to delete the account"
      />
      <Status error={error} done={null} />
      <Pressable
        onPress={confirmDelete}
        disabled={busy}
        className="self-start flex-row items-center gap-2 h-9 px-3.5 rounded-md bg-[rgba(255,77,94,0.12)]"
        accessibilityRole="button"
        accessibilityLabel="Delete account"
      >
        {busy ? <ActivityIndicator color="#FF4D5E" /> : <Icon name="trash" size={16} color="#FF4D5E" />}
        <Text className="text-bm font-medium text-red">Delete account</Text>
      </Pressable>
    </Section>
  );
};

/** The signed-in account: name, email, password, and deleting it. */
export const AccountScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  // Signed out (or the account deleted) while here: nothing left to show.
  useEffect(() => {
    if (!user && navigation.canGoBack()) navigation.goBack();
  }, [user, navigation]);

  return (
    <Screen scrollable={false} className="bg-s0">
      <Header
        titleAlign="start"
        title="Account"
        left={
          <IconButton
            icon={<Icon name="back" size={20} color="#FFFFFF" />}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
        }
      />
      {user && (
        <ScrollView
          className="flex-1 px-5 pt-2"
          contentContainerStyle={{ paddingBottom: 160, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          <Section title="Email">
            <View className="gap-0.5">
              <Text className="text-tm text-t1" numberOfLines={1}>
                {user.email}
              </Text>
              <Text className="text-bs text-t3">{user.emailVerified === false ? 'Not verified yet' : 'Verified'}</Text>
            </View>
          </Section>
          <NameSection />
          <PasswordSection />
          <DeleteSection />
        </ScrollView>
      )}
    </Screen>
  );
};
