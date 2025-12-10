import React, { useState, useRef, useLayoutEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
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

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const webViewRef = useRef<RNWebView>(null);
  const [currentUrl, setCurrentUrl] = useState('http://new.circleftp.net/');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const { downloadFolderUri } = useSettingsStore();
  const { addDownload, updateDownload } = useDownloadStore();

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
    
    Alert.alert(
      'Download Started',
      `${filename} has been added to downloads`,
      [{ text: 'OK' }]
    );
    
    // Start the download with progress and completion callbacks
    await DownloadManager.downloadFile(
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
      },
      (success, localPath, error) => {
        // Update download completion status in store
        if (downloadId && success) {
          updateDownload(downloadId, {
            status: 'completed',
            localPath,
            endTime: Date.now(),
          });
        } else if (downloadId) {
          updateDownload(downloadId, {
            status: 'failed',
            error: error || 'Unknown error occurred',
            endTime: Date.now(),
          });
        }
      }
    );
  };

  const handleStreamVideo = (url: string, title: string) => {
    navigation.navigate('VideoPlayer' as never, { videoUrl: url, title } as never);
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
        webViewRef={webViewRef}
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
