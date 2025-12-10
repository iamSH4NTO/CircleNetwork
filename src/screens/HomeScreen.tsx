import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { CustomWebView } from '../components/CustomWebView';
import { DESKTOP_USER_AGENT } from '../utils/WebViewUtils';
import { DownloadManager } from '../utils/DownloadManager';
import { useSettingsStore } from '../store/SettingsStore';

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const [currentUrl, setCurrentUrl] = useState('http://new.circleftp.net/');
  const { downloadFolderUri } = useSettingsStore();

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
    if (!downloadFolderUri) {
      Alert.alert(
        'No Download Folder',
        'Please select a download folder in Settings first.',
        [{ text: 'OK' }]
      );
      return;
    }

    await DownloadManager.downloadFile(url, filename, downloadFolderUri);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomWebView
        url="http://new.circleftp.net/"
        userAgent={DESKTOP_USER_AGENT}
        onDownload={handleDownload}
        onUrlChange={(url) => setCurrentUrl(url)}
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
