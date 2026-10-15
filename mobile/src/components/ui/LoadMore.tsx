import React from 'react';
import { View } from 'react-native';
import { Button } from './Button';

/**
 * The end of a paged list: asks for the next page, says it is loading, and turns into a retry
 * when the page failed. A failure keeps the songs already loaded.
 */
export const LoadMore = ({ loading, failed, onPress }: { loading: boolean; failed?: boolean; onPress: () => void }) => {
  const label = loading ? 'Loading…' : failed ? "Couldn't load more · Try again" : 'Load more';
  return (
    <View className="items-center py-4">
      <Button variant="outline" size="sm" onPress={onPress} disabled={loading} accessibilityLabel={label}>
        {label}
      </Button>
    </View>
  );
};
