import { navigationRef } from '../data/accountGate';

/**
 * Opens a tab-stack screen (Album, Artist, Playlist, Settings...) in whichever tab is
 * showing. For screens that sit above the tabs, like Now Playing, whose own navigator
 * doesn't know those routes.
 */
export const openInCurrentTab = (name: string, params?: object) => {
  if (!navigationRef.isReady()) return;
  const tabs = navigationRef.getRootState()?.routes.find((r) => r.name === 'Tabs')?.state;
  const tab = tabs && tabs.index !== undefined ? tabs.routes[tabs.index].name : 'Home';
  (navigationRef as any).navigate('Tabs', {
    screen: tab,
    params: { screen: name, params },
  });
};
