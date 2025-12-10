import * as FileSystem from 'expo-file-system';
import { Paths, Directory } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
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

    const downloadDir = new Directory(Paths.document, 'Downloads');
    
    try {
      // Check if directory exists, create if it doesn't
      await downloadDir.create({ intermediates: true });
    } catch (error) {
      console.warn('Directory creation warning:', error);
    }

    Alert.alert(
      'Download Folder',
      `Files will be downloaded to app storage`,
      [{ text: 'OK' }]
    );

    return downloadDir.uri;
  }

  static async downloadFile(
    url: string,
    filename: string,
    folderUri: string | null,
    onProgress?: (progress: number, downloadedBytes: number, totalBytes: number) => void,
    onComplete?: (success: boolean, localPath?: string, error?: string) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        const errorMsg = 'Storage permission is required to download files.';
        Alert.alert('Permission Required', errorMsg);
        onComplete?.(false, undefined, errorMsg);
        return false;
      }

      const downloadDir = new Directory(Paths.document, 'Downloads');
      
      try {
        // Check if directory exists, create if it doesn't
        await downloadDir.create({ intermediates: true });
      } catch (error) {
        console.warn('Directory creation warning:', error);
      }

      const file = new Directory(Paths.document, 'Downloads').createFile(filename, null);

      const downloadResumable = LegacyFileSystem.createDownloadResumable(
        url,
        file.uri,
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
          try {
            const asset = await MediaLibrary.createAssetAsync(result.uri);
            await MediaLibrary.createAlbumAsync('CircleNetwork', asset, false);
          } catch (mediaError) {
            console.warn('Failed to add to media library:', mediaError);
          }
        }

        Alert.alert(
          'Download Complete',
          `${filename} has been downloaded successfully!`,
          [{ text: 'OK' }]
        );
        
        onComplete?.(true, result.uri);
        return true;
      }

      const errorMsg = 'Download completed but result is empty';
      onComplete?.(false, undefined, errorMsg);
      return false;
    } catch (error) {
      console.error('Download failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Could not download the file';
      Alert.alert('Download Failed', errorMsg);
      onComplete?.(false, undefined, errorMsg);
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