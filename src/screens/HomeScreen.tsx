import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView as RNWebView } from 'react-native-webview';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { CustomWebView } from '../components/CustomWebView';
import { DESKTOP_USER_AGENT } from '../utils/WebViewUtils';
import { DownloadManager } from '../utils/DownloadManager';
import { useSettingsStore } from '../store/SettingsStore';
import { useDownloadStore } from '../store/DownloadStore';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation: any = useNavigation();
  const webViewRef = useRef<RNWebView>(null);
  const [currentUrl, setCurrentUrl] = useState('http://new.circleftp.net/');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const { downloadFolderUri } = useSettingsStore();
  const { addDownload, updateDownload, setDownloadTask } = useDownloadStore();

  // Request permissions when component mounts
  useEffect(() => {
    const requestPermissions = async () => {
      await DownloadManager.requestPermissions();
    };
    
    requestPermissions();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          {canGoBack && (
            <TouchableOpacity
              onPress={() => webViewRef.current?.goBack()}
              style={styles.headerButton}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          )}
          {canGoForward && (
            <TouchableOpacity
              onPress={() => webViewRef.current?.goForward()}
              style={styles.headerButton}
            >
              <MaterialIcons
                name="arrow-forward"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => webViewRef.current?.reload()}
            style={styles.headerButton}
          >
            <MaterialIcons name="refresh" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, canGoBack, canGoForward, theme]);

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        Alert.alert(
          'Share URL',
          currentUrl,
          [
            {
              text: 'Copy',
              onPress: () => {
                Alert.alert('Copied', 'URL copied to clipboard');
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    // Add download to store with initial state
    addDownload(url, filename);
    
    // Get the ID of the newly added download
    const downloads = useDownloadStore.getState().downloads;
    const newDownload = downloads.find(d => d.url === url && d.filename === filename);
    const downloadId = newDownload?.id || '';
    
    // Create the download task
    const downloadTask = await DownloadManager.downloadFile(
      url, 
      filename, 
      downloadFolderUri,
      (progress, downloadedBytes, totalBytes) => {
        // Update download progress in store
        if (downloadId) {
          updateDownload(downloadId, {
            progress,
            downloadedSize: downloadedBytes,
            fileSize: totalBytes,
          });
        }
      }
    );
    
    // Store the download task for pause/resume control
    if (downloadId && downloadTask) {
      setDownloadTask(downloadId, downloadTask);
      
      // Start the download
      try {
        const result = await downloadTask.downloadAsync();
        
        if (result) {
          // Handle post-download processing for Android
          if (Platform.OS === 'android') {
            await handleAndroidPostDownload(result, filename, downloadFolderUri);
          }
          
          // Update completion status
          if (downloadId) {
            updateDownload(downloadId, {
              status: 'completed',
              localPath: result.uri,
              endTime: Date.now(),
            });
            Alert.alert(
              'Download Complete',
              `${filename} has been downloaded successfully!`,
              [{ text: 'OK' }]
            );
          }
        }
      } catch (error) {
        console.error('Download failed:', error);
        const errorMsg = error instanceof Error ? error.message : 'Could not download the file';
        
        if (downloadId) {
          updateDownload(downloadId, {
            status: 'failed',
            error: errorMsg,
            endTime: Date.now(),
          });
          
          if (errorMsg !== 'Download cancelled by user') {
            Alert.alert(
              'Download Failed',
              errorMsg,
              [{ text: 'OK' }]
            );
          }
        }
      }
    }
  };
  
  const handleAndroidPostDownload = async (result: any, filename: string, folderUri: string | null) => {
    try {
      // If user selected a folder, copy the file there
      if (folderUri) {
        console.log(`Copying file to selected folder: ${folderUri}, filename: ${filename}`);
        
        // Read the file content
        const fileContent = await FileSystem.readAsStringAsync(result.uri, {
          encoding: 'base64',
        });
        
        // Create and write to the target file using StorageAccessFramework
        const targetFileUri = await StorageAccessFramework.createFileAsync(
          folderUri,
          filename,
          'application/octet-stream'
        );
        
        await FileSystem.writeAsStringAsync(targetFileUri, fileContent, {
          encoding: 'base64',
        });
        
        // Delete the temporary file
        try {
          await FileSystem.deleteAsync(result.uri);
          console.log('Temporary file deleted successfully');
        } catch (deleteError) {
          console.warn('Failed to delete temporary file:', deleteError);
        }
        
        // Update result URI to point to the target file
        result.uri = targetFileUri;
        
        console.log(`File copied successfully to: ${targetFileUri}`);
      } else {
        // No folder selected, use default Downloads directory
        try {
          const defaultDownloadsUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
          console.log(`Copying file to default Downloads folder: ${defaultDownloadsUri}, filename: ${filename}`);
          
          // Read the file content
          const fileContent = await FileSystem.readAsStringAsync(result.uri, {
            encoding: 'base64',
          });
          
          // Create and write to the target file using StorageAccessFramework
          const targetFileUri = await StorageAccessFramework.createFileAsync(
            defaultDownloadsUri,
            filename,
            'application/octet-stream'
          );
          
          await FileSystem.writeAsStringAsync(targetFileUri, fileContent, {
            encoding: 'base64',
          });
          
          // Delete the temporary file
          try {
            await FileSystem.deleteAsync(result.uri);
            console.log('Temporary file deleted successfully');
          } catch (deleteError) {
            console.warn('Failed to delete temporary file:', deleteError);
          }
          
          // Update result URI to point to the target file
          result.uri = targetFileUri;
          
          console.log(`File copied successfully to: ${targetFileUri}`);
        } catch (copyError) {
          console.error('Failed to copy file to default Downloads directory:', copyError);
          // Show an alert to inform the user
          Alert.alert(
            'Download Location',
            `File downloaded to app storage. Could not copy to Downloads folder.`,
            [{ text: 'OK' }]
          );
          // If copying fails, keep the file in the temp location
        }
      }
      
      // Add to media library
      try {
        const asset = await MediaLibrary.createAssetAsync(result.uri);
        await MediaLibrary.createAlbumAsync('CircleNetwork', asset, false);
      } catch (mediaError) {
        console.warn('Failed to add to media library:', mediaError);
      }
    } catch (error) {
      console.error('Post-download processing failed:', error);
      throw error;
    }
  };

  const handleStreamVideo = (url: string, title: string) => {
    navigation.navigate('VideoPlayer', { videoUrl: url, title });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomWebView
        url="http://new.circleftp.net/"
        userAgent={DESKTOP_USER_AGENT}
        onDownload={handleDownload}
        onUrlChange={(url) => setCurrentUrl(url)}
        onNavigationStateChange={(back, forward) => {
          setCanGoBack(back);
          setCanGoForward(forward);
        }}
        onStreamVideo={handleStreamVideo}
        webViewRef={webViewRef as any}
      />
      
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleShare}
      >
        <MaterialIcons name="share" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    marginRight: 8,
  },
  headerButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});