import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, AppState, AppStateStatus } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView as RNWebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { CustomWebView } from '../components/CustomWebView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DESKTOP_USER_AGENT } from '../utils/WebViewUtils';

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation: any = useNavigation();
  const webViewRef = useRef<RNWebView>(null);
  const [currentUrl, setCurrentUrl] = useState('http://new.circleftp.net/');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [useDesktopMode, setUseDesktopMode] = useState(false);
  const [showReloadButton, setShowReloadButton] = useState<boolean>(true);

  // Load desktop mode setting
  const loadDesktopModeSetting = async () => {
    try {
      const desktopMode = await AsyncStorage.getItem('home_desktop_mode');
      setUseDesktopMode(desktopMode === 'true');
    } catch (error) {
      console.log('Error loading home desktop mode setting:', error);
    }
  };

  // Load reload button setting
  const loadReloadButtonSetting = async () => {
    try {
      const showButton = await AsyncStorage.getItem('show_home_reload_button');
      setShowReloadButton(showButton !== 'false'); // Default to true if not set
    } catch (error) {
      console.log('Error loading reload button setting:', error);
    }
  };

  // Load desktop mode setting on mount
  useEffect(() => {
    loadDesktopModeSetting();
    loadReloadButtonSetting();
  }, []);

  // Listen for app state changes to refresh settings
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, reload settings
        loadDesktopModeSetting();
        loadReloadButtonSetting();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Also listen for focus events on navigation
    const unsubscribeFocus = navigation.addListener('focus', () => {
      loadDesktopModeSetting();
      loadReloadButtonSetting();
    });

    return () => {
      subscription?.remove();
      unsubscribeFocus();
    };
  }, [navigation]);

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

  // Handle reload button press
  const handleReload = () => {
    webViewRef.current?.reload();
  };
  
  const handleStreamVideo = (url: string, title: string) => {
    navigation.navigate('VideoPlayer', { videoUrl: url, title });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomWebView
        url="http://new.circleftp.net/"
        userAgent={useDesktopMode ? DESKTOP_USER_AGENT : undefined}
        onUrlChange={(url) => setCurrentUrl(url)}
        onNavigationStateChange={(back, forward) => {
          setCanGoBack(back);
          setCanGoForward(forward);
        }}
        onStreamVideo={handleStreamVideo}
        webViewRef={webViewRef as any}
      />
      
      {showReloadButton && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.error }]}
          onPress={handleReload}
        >
          <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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