import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { Alert, Platform } from "react-native";

// Interface for download progress updates
export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
}

// A map to keep track of active download tasks
const activeDownloads = new Map<string, FileSystem.DownloadResumable>();

/**
 * A professional and robust download manager for Expo applications.
 */
export class DownloadManager {
  /**
   * Requests necessary storage permissions.
   * @returns `true` if permissions are granted, otherwise `false`.
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") {
      return true; // Permissions are generally not required for app-specific directories on iOS
    }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Storage permission is required to save files.",
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Permission request failed:", error);
      return false;
    }
  }

  /**
   * Allows the user to select a download folder.
   * - Android: Uses Storage Access Framework to let the user pick any folder.
   * - iOS: Uses a "Downloads" folder within the app's private document directory.
   * @returns The URI of the selected folder, or `null`.
   */
  static async selectDownloadFolder(): Promise<string | null> {
    if (Platform.OS === "android") {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      try {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          return permissions.directoryUri;
        }
        return null; // User cancelled folder selection
      } catch (error) {
        console.error("Folder selection failed:", error);
        Alert.alert("Error", "Failed to select a download folder.");
        return null;
      }
    } else {
      // For iOS, create and use a directory within the app's sandbox
      const iosDownloadDir = FileSystem.documentDirectory + "Downloads/";
      await FileSystem.makeDirectoryAsync(iosDownloadDir, {
        intermediates: true,
      });
      return iosDownloadDir;
    }
  }

  /**
   * Starts a new file download.
   *
   * @param id - A unique ID for the download.
   * @param url - The URL of the file to download.
   * @param destinationUri - The folder URI where the file will be saved.
   * @param filename - The name of the file.
   * @param onProgress - A callback to report download progress.
   * @returns A promise that resolves with the final URI of the saved file or `null` on failure.
   */
  static async startDownload(
    id: string,
    url: string,
    destinationUri: string,
    filename: string,
    onProgress: (progress: DownloadProgress) => void,
  ): Promise<string | null> {
    if (activeDownloads.has(id)) {
      console.warn(`Download with ID ${id} is already in progress.`);
      return null;
    }

    const tempFileUri = FileSystem.cacheDirectory + `dl-cache-${id}`;
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      tempFileUri,
      {},
      onProgress,
    );

    activeDownloads.set(id, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error("Download failed for an unknown reason.");
      }

      let finalUri: string;

      if (
        Platform.OS === "android" &&
        destinationUri.startsWith("content://")
      ) {
        // Android (SAF): Move file content to the user-picked folder
        const content = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        finalUri = await FileSystem.StorageAccessFramework.createFileAsync(
          destinationUri,
          filename,
          result.mimeType || "application/octet-stream",
        );

        await FileSystem.writeAsStringAsync(finalUri, content, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await FileSystem.deleteAsync(result.uri); // Clean up temp file
      } else {
        // iOS (or Android with legacy storage): Move the file directly
        finalUri = destinationUri + filename;
        // Ensure no file exists at the destination
        const existingFileInfo = await FileSystem.getInfoAsync(finalUri);
        if (existingFileInfo.exists) {
          await FileSystem.deleteAsync(finalUri);
        }

        await FileSystem.moveAsync({
          from: result.uri,
          to: finalUri,
        });
      }

      return finalUri;
    } catch (error: any) {
      console.error(`Download failed for ID ${id}:`, error);
      // Ensure temp file is cleaned up on failure
      const tempFileInfo = await FileSystem.getInfoAsync(tempFileUri);
      if (tempFileInfo.exists) {
        await FileSystem.deleteAsync(tempFileUri);
      }
      return null;
    } finally {
      activeDownloads.delete(id);
    }
  }

  /**
   * Pauses an active download.
   * @param id - The ID of the download to pause.
   */
  static async pauseDownload(id: string): Promise<void> {
    const download = activeDownloads.get(id);
    if (download) {
      await download.pauseAsync();
    }
  }

  /**
   * Resumes a paused download.
   * @param id - The ID of the download to resume.
   */
  static async resumeDownload(id: string): Promise<void> {
    const download = activeDownloads.get(id);
    if (download) {
      await download.resumeAsync();
    }
  }

  /**
   * Cancels an active download and cleans up temporary files.
   * @param id - The ID of the download to cancel.
   */
  static async cancelDownload(id: string): Promise<void> {
    const download = activeDownloads.get(id);
    if (download) {
      await download.cancelAsync();
      // The temp file is deleted automatically by cancelAsync
      activeDownloads.delete(id);
    }
  }

  /**
   * Retrieves the resumable state of a paused download.
   * @param id The ID of the download.
   * @returns Serializable resumable state object.
   */
  static async getResumableState(
    id: string,
  ): Promise<FileSystem.DownloadResumableState | null> {
    const download = activeDownloads.get(id);
    if (download) {
      return download.savable();
    }
    return null;
  }
}
