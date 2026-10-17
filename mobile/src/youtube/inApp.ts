import { Innertube, Log } from 'youtubei.js/react-native';
import { createYoutubeiSource, probeRange, type YoutubeiSource } from '../../../shared/youtube/youtubeiSource';
import { createCatalog } from '../../../shared/catalog/catalog';
import { memoizeCatalog } from '../../../shared/catalog/memo';
import type { InnertubeLike } from '../../../shared/youtube/innertubeLike';
import { getYoutubeClients, subscribeAppConfig } from './appConfig';
import { xhrFetch } from './xhrFetch';

// The app fetches YouTube itself (from the phone's own IP) through youtubei.js; data/api.ts
// falls back to the backend when this fails or the admin turns it off.

// youtubei.js logs a parser warning for every unknown node; keep only errors.
Log.setLevel(Log.Level.ERROR);

export type InAppCatalog = ReturnType<typeof createCatalog>;

let session: Promise<InnertubeLike> | null = null;
let source: YoutubeiSource | null = null;
let catalog: InAppCatalog | null = null;
let clientsKey = getYoutubeClients().join(',');

const newInnertube = async (): Promise<InnertubeLike> =>
  // VISIONOS urls need no deciphering, so skip downloading and parsing the player script
  // (about 30 s on Hermes).
  (await Innertube.create({ retrieve_player: false, fetch: xhrFetch })) as unknown as InnertubeLike;

/** HTTP status of a 1 KB ranged GET on a stream url: limited urls 403 past the first ~1 MB. */
const probeStream = async (url: string, contentLength: number): Promise<number> => {
  const { start, end } = probeRange(contentLength);
  return (await xhrFetch(url, { headers: { Range: `bytes=${start}-${end}` } }, 10_000)).status;
};

const build = (yt: InnertubeLike) => {
  source = createYoutubeiSource(yt, { clients: getYoutubeClients(), probe: probeStream, newSession: newInnertube });
  catalog = memoizeCatalog(createCatalog(source));
};

// A new client order from /app-config applies from the next call; the session is kept.
subscribeAppConfig(() => {
  const key = getYoutubeClients().join(',');
  if (key === clientsKey) return;
  clientsKey = key;
  source = null;
  catalog = null;
});

export const getInAppCatalog = async (): Promise<InAppCatalog> => {
  if (catalog) return catalog;
  session ??= newInnertube().catch((err: unknown) => {
    // Let the next call try again rather than keeping in-app off until a restart.
    session = null;
    throw err;
  });
  const yt = await session;
  if (!catalog) build(yt);
  return catalog!;
};

/** After googlevideo refused a url: the next stream lookup uses a fresh session. */
export const refreshInAppSession = async (): Promise<void> => {
  await source?.refresh();
};

export const setMockInAppCatalogForTesting = (mock: InAppCatalog | null): void => {
  catalog = mock;
};

export const resetInAppForTesting = (): void => {
  session = null;
  source = null;
  catalog = null;
  clientsKey = getYoutubeClients().join(',');
};
