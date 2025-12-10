import * as FileSystem from 'expo-file-system';
import { Paths, Directory, File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';

export class DownloadManager {
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        console.log('Storage permissions granted');
        return true;
      } else {
        console.log('Storage permissions denied');
        return false;
      }
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
      } catch (error: any) {
        // Ignore error if directory already exists
        if (!(error.message && error.message.includes('it already exists'))) {
          console.warn('Directory creation warning:', error);
        }
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
  ): Promise<any> { // Return the download task for pause/resume control
    try {
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        const errorMsg = 'Storage permission is required to download files.';
        Alert.alert('Permission Required', errorMsg);
        onComplete?.(false, undefined, errorMsg);
        return null;
      }

      // Sanitize the filename
      const sanitizedFilename = this.sanitizeFilename(filename);

      if (Platform.OS === 'android') {
        // For Android, download to app storage first, then copy to selected folder
        // This is the most reliable approach for Storage Access Framework
        
        // Download to app's document directory first
        const tempDir = new Directory(Paths.document, 'Downloads');
        try {
          await tempDir.create({ intermediates: true });
        } catch (error: any) {
          // Ignore error if directory already exists
          if (!(error.message && error.message.includes('it already exists'))) {
            console.warn('Temp directory creation warning:', error);
          }
        }
        
        // Check for file conflict in temp directory
        const tempFile = tempDir.createFile(sanitizedFilename, null);
        let finalTempFilename = sanitizedFilename;
        
        if (tempFile.exists) {
          // File exists in temp directory, generate a new filename with timestamp
          const nameParts = sanitizedFilename.split('.');
          const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
          const nameWithoutExtension = nameParts.join('.');
          const timestamp = Date.now();
          finalTempFilename = `${nameWithoutExtension}_${timestamp}${extension}`;
        }
        
        const downloadFile = tempDir.createFile(finalTempFilename, null);
        
        // Create download resumable task
        const downloadResumable = LegacyFileSystem.createDownloadResumable(
          url,
          downloadFile.uri,
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

        // Return the task immediately for pause/resume control
        // The caller will handle starting the download
        return downloadResumable;
      } else {
        // For iOS, use traditional approach with app storage
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
        } catch (error: any) {
          // Ignore error if directory already exists
          if (!(error.message && error.message.includes('it already exists'))) {
            console.warn('Directory creation warning:', error);
          }
        }
        
        // Check for file conflict
        const file = downloadDir.createFile(sanitizedFilename, null);
        if (file.exists) {
          // File exists, generate a new filename with timestamp
          const nameParts = sanitizedFilename.split('.');
          const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
          const nameWithoutExtension = nameParts.join('.');
          const timestamp = Date.now();
          const newFilename = `${nameWithoutExtension}_${timestamp}${extension}`;
          
          console.log(`File exists, creating with timestamp: ${newFilename}`);
          
          // Proceed with download using new filename
          const downloadFile = downloadDir.createFile(newFilename, null);
          const downloadResumable = LegacyFileSystem.createDownloadResumable(
            url,
            downloadFile.uri,
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

          // Return the task immediately for pause/resume control
          return downloadResumable;
        } else {
          // No conflict, proceed with original filename
          const downloadFile = downloadDir.createFile(sanitizedFilename, null);
          
          const downloadResumable = LegacyFileSystem.createDownloadResumable(
            url,
            downloadFile.uri,
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

          // Return the task immediately for pause/resume control
          return downloadResumable;
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Could not download the file';
      Alert.alert('Download Failed', errorMsg);
      onComplete?.(false, undefined, errorMsg);
      return null;
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

  static async getDownloadStatus(task: any): Promise<'running' | 'paused' | 'done' | 'error' | 'unknown'> {
    try {
      if (task && typeof task.savable === 'function') {
        const savable = await task.savable();
        if (savable) {
          return 'paused';
        }
      }
      return 'unknown';
    } catch (error) {
      console.warn('Failed to get download status:', error);
      return 'unknown';
    }
  }

  static async restartDownload(task: any): Promise<any> {
    try {
      if (task && typeof task.resume === 'function') {
        return await task.resume();
      }
      return null;
    } catch (error) {
      console.warn('Failed to restart download:', error);
      return null;
    }
  }
}