import { Alert } from 'react-native';
import { useDownloadsStore, type DownloadItem } from '../store/downloads';

/**
 * Asks first, then deletes downloads: finished files from the folder they were saved to,
 * unfinished ones with their partial data. A file that moved (or can't be deleted) is only
 * taken off the list, and the user is told so.
 */
export function confirmRemoveDownloads(items: DownloadItem[]) {
  const done = items.some((d) => d.status === 'done');
  const what = items.length === 1 ? `"${items[0].title}"` : `${items.length} downloads`;
  Alert.alert(`Delete ${what}?`, done ? 'The file is deleted from the folder it was saved to.' : undefined, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        let kept = 0;
        let reason: string | undefined;
        for (const d of items) {
          const r = await useDownloadsStore.getState().remove(d.id);
          if (!r.fileDeleted && d.status === 'done') {
            kept++;
            reason = r.reason;
          }
        }
        if (kept > 0) {
          Alert.alert(
            'Removed from downloads',
            items.length === 1
              ? `${reason ?? "The file couldn't be deleted"}, so it was only removed from the list.`
              : `${kept} files had moved or couldn't be deleted, so they were only removed from the list.`,
          );
        }
      },
    },
  ]);
}
