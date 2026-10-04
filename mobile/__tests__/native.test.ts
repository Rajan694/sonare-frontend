import { NativeModules } from 'react-native';
import { SonarePlayer } from '../src/native/SonarePlayer';
import { SonareDownloads } from '../src/native/SonareDownloads';

describe('Native Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SonarePlayer.ts', () => {
    it('MOB-NAT-001 load invokes NativeModules.SonarePlayer.load', async () => {
      const opts = {
        id: 't1',
        url: 'http://stream/1',
        title: 'Song 1',
        artist: 'Artist 1',
      };
      await SonarePlayer.load(opts);
      expect(NativeModules.SonarePlayer.load).toHaveBeenCalledWith(opts);
    });

    it('MOB-NAT-002 play, pause, seekTo, stop invoke native player methods', () => {
      SonarePlayer.play();
      expect(NativeModules.SonarePlayer.play).toHaveBeenCalled();

      SonarePlayer.pause();
      expect(NativeModules.SonarePlayer.pause).toHaveBeenCalled();

      SonarePlayer.seekTo(15000);
      expect(NativeModules.SonarePlayer.seekTo).toHaveBeenCalledWith(15000);

      SonarePlayer.stop();
      expect(NativeModules.SonarePlayer.stop).toHaveBeenCalled();
    });

    it('MOB-NAT-003 player events reach their own handlers until unsubscribed', () => {
      const emitter = new (require('react-native').NativeEventEmitter)();
      const state = jest.fn();
      const progress = jest.fn();
      const error = jest.fn();
      const remote = jest.fn();
      const stateSub = SonarePlayer.onState(state);
      SonarePlayer.onProgress(progress);
      SonarePlayer.onError(error);
      SonarePlayer.onRemote(remote);
      emitter.emit('SonarePlayer.state', { state: 'playing' });
      emitter.emit('SonarePlayer.progress', {
        positionMs: 1000,
        durationMs: 2000,
      });
      emitter.emit('SonarePlayer.error', { message: 'Source error' });
      emitter.emit('SonarePlayer.remote', { command: 'next' });
      // Another module's event with the same short name must not leak in.
      emitter.emit('SonareDownloads.progress', { id: 'x' });
      expect(state).toHaveBeenCalledWith({ state: 'playing' });
      expect(progress).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith({ message: 'Source error' });
      expect(remote).toHaveBeenCalledWith({ command: 'next' });
      stateSub.remove();
      emitter.emit('SonarePlayer.state', { state: 'paused' });
      expect(state).toHaveBeenCalledTimes(1);
    });
  });

  describe('SonareDownloads.ts', () => {
    it('MOB-NAT-004 setActive, start, pause, discard, partSize invoke native methods', async () => {
      SonareDownloads.setActive(2);
      expect(NativeModules.SonareDownloads.setActive).toHaveBeenCalledWith(2);

      const startOpts = {
        id: 'd1',
        url: 'http://dl/1',
        baseName: 'Artist - Title',
        extension: 'opus',
        mimeType: 'audio/webm',
        totalBytes: 5000,
      };
      await SonareDownloads.start(startOpts);
      expect(NativeModules.SonareDownloads.start).toHaveBeenCalledWith(startOpts);

      const pausedBytes = await SonareDownloads.pause('d1');
      expect(pausedBytes).toBe(100);

      await SonareDownloads.discard('d1');
      expect(NativeModules.SonareDownloads.discard).toHaveBeenCalledWith('d1');

      const size = await SonareDownloads.partSize('d1');
      expect(size).toBe(50);
    });

    it('MOB-NAT-005 deleteFile, exists, pickFolder, defaultLocation invoke file system methods', async () => {
      const deleted = await SonareDownloads.deleteFile('file:///music/song.opus', 'song.opus');
      expect(deleted).toBe(true);

      const exists = await SonareDownloads.exists('file:///music/song.opus');
      expect(exists).toBe(true);

      const folder = await SonareDownloads.pickFolder();
      expect(folder?.name).toBe('Music');

      const loc = await SonareDownloads.defaultLocation();
      expect(loc).toBe('Music/Sonare');
    });

    it('MOB-NAT-006 download events reach their own handlers until unsubscribed', () => {
      const emitter = new (require('react-native').NativeEventEmitter)();
      const progress = jest.fn();
      const done = jest.fn();
      const error = jest.fn();
      const sub = SonareDownloads.onProgress(progress);
      SonareDownloads.onDone(done);
      SonareDownloads.onError(error);
      emitter.emit('SonareDownloads.progress', { id: 'yt:1', received: 10 });
      emitter.emit('SonareDownloads.done', { id: 'yt:1', uri: 'content://x' });
      emitter.emit('SonareDownloads.error', {
        id: 'yt:1',
        message: 'No space',
      });
      emitter.emit('SonarePlayer.progress', { positionMs: 1 });
      expect(progress).toHaveBeenCalledTimes(1);
      expect(progress).toHaveBeenCalledWith({ id: 'yt:1', received: 10 });
      expect(done).toHaveBeenCalledWith({ id: 'yt:1', uri: 'content://x' });
      expect(error).toHaveBeenCalledWith({ id: 'yt:1', message: 'No space' });
      sub.remove();
      emitter.emit('SonareDownloads.progress', { id: 'yt:1', received: 20 });
      expect(progress).toHaveBeenCalledTimes(1);
    });
  });
});
