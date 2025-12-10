import * as FileSystem from 'expo-file-system';
import { Paths, Directory } from 'expo-file-system';
import { EncodingType } from 'expo-file-system/src/ExpoFileSystem.types';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
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

    // For Android, let users select a folder using StorageAccessFramework
    // For iOS, we'll use the app's document directory
    if (Platform.OS === 'android') {
      try {
        // Request directory permissions from user
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          return permissions.directoryUri;
        } else {
          Alert.alert('Permission Denied', 'Folder selection permission was denied.');
          return null;
        }
      } catch (error) {
        console.error('Folder selection failed:', error);
        Alert.alert('Error', 'Failed to select folder.');
        return null;
      }
    } else {
      // For iOS, use the app's document directory
      const downloadDir = new Directory(Paths.document, 'Downloads');
      try {
        await downloadDir.create({ intermediates: true });
      } catch (error) {
        console.warn('Directory creation warning:', error);
      }
      
      Alert.alert(
        'Download Folder',
        'Files will be downloaded to app storage',
        [{ text: 'OK' }]
      );
      
      return downloadDir.uri;
    }
  }

  // Helper function to sanitize filename
  static sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') // Replace invalid characters with underscore
      .replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i, '_$1$2') // Replace reserved names
      .replace(/[\s.]+$/, '') // Remove trailing spaces and periods
      .substring(0, 255); // Limit length
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

      // Sanitize the filename
      const sanitizedFilename = this.sanitizeFilename(filename);

      // Use the provided folder URI if available, otherwise use default
      let fileUri: string;
      
      if (Platform.OS === 'android') {
        // For Android, handle SAF URIs properly
        let targetDirUri: string;
        
        if (folderUri) {
          // Use the user-selected folder
          targetDirUri = folderUri;
        } else {
          // Fallback to default Downloads directory
          targetDirUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
        }
        
        // For Android, we'll download to app's document directory first, then move to target
        const tempDir = new Directory(Paths.document, 'Downloads');
        try {
          await tempDir.create({ intermediates: true });
        } catch (error) {
          console.warn('Temp directory creation warning:', error);
        }
        
        const tempFile = tempDir.createFile(sanitizedFilename, null);
        fileUri = tempFile.uri;
      } else {
        // For iOS, use traditional approach
        let downloadDir: Directory;
        
        if (folderUri) {
          // Use the user-selected folder
          downloadDir = new Directory(folderUri);
        } else {
          // Fallback to app's document directory
          downloadDir = new Directory(Paths.document, 'Downloads');
        }
        
        try {
          await downloadDir.create({ intermediates: true });
        } catch (error) {
          console.warn('Directory creation warning:', error);
        }
        
        const file = downloadDir.createFile(sanitizedFilename, null);
        fileUri = file.uri;
      }

      const downloadResumable = LegacyFileSystem.createDownloadResumable(
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
        // For Android, move the file to the selected directory if needed
        if (Platform.OS === 'android' && folderUri) {
          try {
            // Read the downloaded file
            const fileContent = await FileSystem.readAsStringAsync(result.uri, {
              encoding: EncodingType.Base64
            });
            
            // Create file in the target directory using StorageAccessFramework
            const targetFileUri = await StorageAccessFramework.createFileAsync(
              folderUri,
              sanitizedFilename,
              'application/octet-stream'
            );
            
            // Write content to the target file
            await FileSystem.writeAsStringAsync(targetFileUri, fileContent, {
              encoding: EncodingType.Base64
            });
            
            // Delete the temporary file
            try {
              await FileSystem.deleteAsync(result.uri);
            } catch (deleteError) {
              console.warn('Failed to delete temporary file:', deleteError);
            }
            
            // Update result URI to point to the target file
            result.uri = targetFileUri;
          } catch (moveError) {
            console.error('Failed to move file to selected directory:', moveError);
            // If moving fails, keep the file in the temp location
          }
        }
        
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
          `${sanitizedFilename} has been downloaded successfully!`,
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