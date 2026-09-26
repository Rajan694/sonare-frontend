import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Button } from './Button';

interface StateViewProps {
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** Shown when neither loading nor failed. */
  empty?: string;
}

/** The loading / error / empty placeholder shared by every data-backed list. */
export function StateView({ loading, error, onRetry, empty }: StateViewProps) {
  if (loading) {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator color="#00E28A" />
      </View>
    );
  }
  if (error) {
    const offline = error.message === 'Network request failed';
    // The backend is up but Piped isn't; its raw message names a localhost URL.
    const upstreamDown = (error as { code?: string }).code === 'UPSTREAM_UNAVAILABLE';
    return (
      <View className="py-12 px-8 items-center gap-3">
        <Text className="text-t2 text-bm text-center">
          {offline
            ? "Can't reach the Sonare server."
            : upstreamDown
              ? "Sonare's music service isn't responding. Try again in a moment."
              : error.message}
        </Text>
        {onRetry && (
          <Button variant="outline" size="sm" onPress={onRetry}>
            Try again
          </Button>
        )}
      </View>
    );
  }
  if (empty) {
    return (
      <View className="py-12 px-8 items-center">
        <Text className="text-t3 text-bm text-center">{empty}</Text>
      </View>
    );
  }
  return null;
}
