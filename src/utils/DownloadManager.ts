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
        // For Android, directly download to the selected folder using StorageAccessFramework
        // This avoids memory issues with large files
        let targetFolderUri: string;
        
        if (folderUri) {
          targetFolderUri = folderUri;
        } else {
          // Fallback to default Downloads directory via SAF
          targetFolderUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
        }
        
        try {
          console.log(`Creating file in folder: ${targetFolderUri}, filename: ${sanitizedFilename}`);
          
          // Create file in the target directory using StorageAccessFramework
          const targetFileUri = await StorageAccessFramework.createFileAsync(
            targetFolderUri,
            sanitizedFilename,
            'application/octet-stream'
          );
          
          console.log(`File created successfully at: ${targetFileUri}`);
          
          // Directly download to the target file
          const downloadResumable = LegacyFileSystem.createDownloadResumable(
            url,
            targetFileUri,
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

          // Start the download
          console.log(`Starting download from: ${url}`);
          const result = await downloadResumable.downloadAsync();
          
          if (result) {
            console.log(`Download completed successfully. File size: ${result.headers['content-length'] || 'unknown'}`);
            
            try {
              const asset = await MediaLibrary.createAssetAsync(result.uri);
              await MediaLibrary.createAlbumAsync('CircleNetwork', asset, false);
            } catch (mediaError) {
              console.warn('Failed to add to media library:', mediaError);
            }

            Alert.alert(
              'Download Complete',
              `${sanitizedFilename} has been downloaded successfully!`,
              [{ text: 'OK' }]
            );
            
            onComplete?.(true, result.uri);
            return downloadResumable; // Return the task for pause/resume control
          }
        } catch (error: any) {
          console.error('Download failed:', error);
          // If there's a conflict or other error, try with a timestamp
          if (error.message && (error.message.includes('exists') || error.message.includes('Failed to create file'))) {
            const nameParts = sanitizedFilename.split('.');
            const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
            const nameWithoutExtension = nameParts.join('.');
            const timestamp = Date.now();
            const newFilename = `${nameWithoutExtension}_${timestamp}${extension}`;
            
            try {
              console.log(`File exists, creating with timestamp: ${newFilename}`);
              
              // Create file with timestamp
              const targetFileUri = await StorageAccessFramework.createFileAsync(
                targetFolderUri,
                newFilename,
                'application/octet-stream'
              );
              
              // Directly download to the target file
              const downloadResumable = LegacyFileSystem.createDownloadResumable(
                url,
                targetFileUri,
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

              // Start the download
              const result = await downloadResumable.downloadAsync();
              
              if (result) {
                try {
                  const asset = await MediaLibrary.createAssetAsync(result.uri);
                  await MediaLibrary.createAlbumAsync('CircleNetwork', asset, false);
                } catch (mediaError) {
                  console.warn('Failed to add to media library:', mediaError);
                }

                Alert.alert(
                  'Download Complete',
                  `${newFilename} has been downloaded successfully!`,
                  [{ text: 'OK' }]
                );
                
                onComplete?.(true, result.uri);
                return downloadResumable; // Return the task for pause/resume control
              }
            } catch (retryError) {
              console.error('Retry download failed:', retryError);
              throw retryError;
            }
          } else {
            throw error;
          }
        }
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

          // Start the download
          const result = await downloadResumable.downloadAsync();
          
          if (result) {
            Alert.alert(
              'Download Complete',
              `${newFilename} has been downloaded successfully!`,
              [{ text: 'OK' }]
            );
            
            onComplete?.(true, result.uri);
            return downloadResumable; // Return the task for pause/resume control
          }
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

          // Start the download
          const result = await downloadResumable.downloadAsync();
          
          if (result) {
            Alert.alert(
              'Download Complete',
              `${sanitizedFilename} has been downloaded successfully!`,
              [{ text: 'OK' }]
            );
            
            onComplete?.(true, result.uri);
            return downloadResumable; // Return the task for pause/resume control
          }
        }
      }

      const errorMsg = 'Download completed but result is empty';
      onComplete?.(false, undefined, errorMsg);
      return null;
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
}