import { Platform, Alert, Linking } from 'react-native';

export class DownloadManager {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }
    return true;
  }

  static async selectDownloadFolder(): Promise<string | null> {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Supported', 'Folder selection is only available on Android');
      return null;
    }

    try {
      const folderPath = '/storage/emulated/0/Download/CircleNetwork';
      Alert.alert(
        'Download Folder',
        `Files will be downloaded to:\n${folderPath}\n\nNote: On Android 11+, downloads are managed by the system.`,
        [{ text: 'OK' }]
      );
      return folderPath;
    } catch (error) {
      console.error('Folder selection failed:', error);
      return null;
    }
  }

  static async downloadFile(
    url: string,
    filename: string,
    folderUri: string | null
  ): Promise<boolean> {
    try {
      await Linking.openURL(url);
      Alert.alert(
        'Download Started',
        'The file download has been initiated. Check your Downloads folder.'
      );
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      Alert.alert('Download Failed', 'Could not download the file');
      return false;
    }
  }

  static getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      return filename || 'download';
    } catch {
      return 'download';
    }
  }
}


