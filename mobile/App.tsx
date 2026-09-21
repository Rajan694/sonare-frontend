/**
 * Sonare mobile app.
 *
 * @format
 */

import {
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView
        style={[
          styles.container,
          isDarkMode ? styles.containerDark : styles.containerLight,
        ]}
      >
        <View style={styles.content}>
          <Text
            style={[styles.greeting, isDarkMode ? styles.textDark : styles.textLight]}
          >
            Hii Rajan!!!
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '600',
  },
  containerLight: {
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#1b1b1f',
  },
  textLight: {
    color: '#111111',
  },
  textDark: {
    color: '#eaeaea',
  },
});

export default App;
