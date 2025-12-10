import * as FileSystem from "expo-file-system";
import { Paths, Directory, File } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { StorageAccessFramework } from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Alert, Platform } from "react-native";

export class DownloadManager {
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        console.log("Storage permissions granted");
        return true;
      } else {
        console.log("Storage permissions denied");
        return false;
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      return false;
    }
  }

  static async selectDownloadFolder(): Promise<string | null> {
    const hasPermission = await this.requestPermissions();

    if (!hasPermission) {
      Alert.alert(
        "Permission Required",
        "Storage permission is required to download files.",
      );
      return null;
    }

    if (Platform.OS === "android") {
      try {
        const permissions =
          await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          return permissions.directoryUri;
        } else {
          Alert.alert(
            "Permission Denied",
            "Folder selection permission was denied.",
          );
          return null;
        }
      } catch (error) {
        console.error("Folder selection failed:", error);
        Alert.alert("Error", "Failed to select folder.");
        return null;
      }
    } else {
      const downloadDir = new Directory(Paths.document, "Downloads");
      try {
        await downloadDir.create({ intermediates: true });
      } catch (error: any) {
        if (!(error.message && error.message.includes("it already exists"))) {
          console.warn("Directory creation warning:", error);
        }
      }

      Alert.alert(
        "Download Folder",
        "Files will be downloaded to app storage",
        [{ text: "OK" }],
      );

      return downloadDir.uri;
    }
  }

  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i, "_$1$2")
      .replace(/[\s.]+$/, "")
      .substring(0, 255);
  }

  static async downloadFile(
    url: string,
    filename: string,
    folderUri: string | null,
    onProgress?: (
      progress: number,
      downloadedBytes: number,
      totalBytes: number,
    ) => void,
  ): Promise<{
    task: LegacyFileSystem.DownloadResumable;
    finalUri?: string;
  } | null> {
    try {
      const hasPermission = await this.requestPermissions();

      if (!hasPermission) {
        const errorMsg = "Storage permission is required to download files.";
        Alert.alert("Permission Required", errorMsg);
        return null;
      }

      const sanitizedFilename = this.sanitizeFilename(filename);

      if (Platform.OS === "android" && folderUri) {
        const tempDir = new Directory(Paths.document, "Downloads");
        try {
          await tempDir.create({ intermediates: true });
        } catch (error: any) {
          if (!(error.message && error.message.includes("it already exists"))) {
            console.warn("Temp directory creation warning:", error);
          }
        }

        const tempFile = tempDir.createFile(sanitizedFilename);
        const downloadResumable = LegacyFileSystem.createDownloadResumable(
          url,
          tempFile.uri,
          {},
          (downloadProgress) => {
            const progress =
              (downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite) *
              100;
            if (onProgress) {
              onProgress(
                progress,
                downloadProgress.totalBytesWritten,
                downloadProgress.totalBytesExpectedToWrite,
              );
            }
          },
        );

        const result = await downloadResumable.downloadAsync();
        if (result) {
          const finalFileUri = await StorageAccessFramework.createFileAsync(
            folderUri,
            sanitizedFilename,
            result.mimeType || "application/octet-stream",
          );
          const content = await FileSystem.readAsStringAsync(result.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.writeAsStringAsync(finalFileUri, content, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.deleteAsync(result.uri); // remove temp file
          return { task: downloadResumable, finalUri: finalFileUri };
        }
        return { task: downloadResumable };
      } else {
        let downloadDir: Directory;

        if (folderUri) {
          downloadDir = new Directory(folderUri);
        } else {
          downloadDir = new Directory(Paths.document, "Downloads");
        }

        try {
          await downloadDir.create({ intermediates: true });
        } catch (error: any) {
          if (!(error.message && error.message.includes("it already exists"))) {
            console.warn("Directory creation warning:", error);
          }
        }

        const file = downloadDir.createFile(sanitizedFilename);
        let finalFilename = sanitizedFilename;

        if (file.exists) {
          const nameParts = sanitizedFilename.split(".");
          const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : "";
          const nameWithoutExtension = nameParts.join(".");
          const timestamp = Date.now();
          finalFilename = `${nameWithoutExtension}_${timestamp}${extension}`;
        }

        const downloadFile = downloadDir.createFile(finalFilename);
        const downloadResumable = LegacyFileSystem.createDownloadResumable(
          url,
          downloadFile.uri,
          {},
          (downloadProgress) => {
            const progress =
              (downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite) *
              100;
            if (onProgress) {
              onProgress(
                progress,
                downloadProgress.totalBytesWritten,
                downloadProgress.totalBytesExpectedToWrite,
              );
            }
          },
        );
        return { task: downloadResumable, finalUri: downloadFile.uri };
      }
    } catch (error) {
      console.error("Download failed:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Could not download the file";
      Alert.alert("Download Failed", errorMsg);
      return null;
    }
  }

  static getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf("/") + 1);
      return filename || "download";
    } catch {
      return "download";
    }
  }
}
