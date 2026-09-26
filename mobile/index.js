/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { installErrorReporting } from './src/lib/errorReporting';

// Before anything else runs, so errors during startup are reported too.
installErrorReporting();

// Library noise, not app code: NativeWind's interop touches the deprecated SafeAreaView and
// ImageBackground exports, and Moti passes deps to Reanimated hooks. The LogBox toast they
// raise sits on top of the tab bar in dev.
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'ImageBackground is deprecated',
  '[Reanimated] Dependencies should only be used on the web',
]);

AppRegistry.registerComponent(appName, () => App);
