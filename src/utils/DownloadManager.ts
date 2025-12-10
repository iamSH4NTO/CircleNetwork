import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';

export class DownloadManager {
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  static async selectDownloadFolder(): Promise<string | null> {
    const hasPermission = await this.requestPermissions();
    
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Storage permission is required to download files.'
      );
      return null;
    }

    const downloadDir = FileSystem.documentDirectory + 'Downloads/';
    
    const dirInfo = await FileSystem.getInfoAsync(downloadDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
    }

    Alert.alert(
      'Download Folder',
      `Files will be downloaded to app storage`,
      [{ text: 'OK' }]
    );

    return downloadDir;
  }

  static async downloadFile(
    url: string,
    filename: string,
    folderUri: string | null,
    onProgress?: (progress: number, downloadedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Storage permission is required to download files.'
        );
        return false;
      }

      const downloadDir = FileSystem.documentDirectory + 'Downloads/';
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      const fileUri = downloadDir + filename;

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
          if (onProgress) {
            onProgress(
              progress,
              downloadProgress.totalBytesWritten,
              downloadProgress.totalBytesExpectedToWrite
            );
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result) {
        if (Platform.OS === 'android') {
          const asset = await MediaLibrary.createAssetAsync(result.uri);
          await MediaLibrary.createAlbumAsync('CircleNetwork', asset, false);
        }

        Alert.alert(
          'Download Complete',
          `${filename} has been downloaded successfully!`,
          [{ text: 'OK' }]
        );
        return true;
      }

      return false;
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
