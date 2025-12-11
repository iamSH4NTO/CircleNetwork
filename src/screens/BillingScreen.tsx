import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView as RNWebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { CustomWebView } from '../components/CustomWebView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DESKTOP_USER_AGENT } from '../utils/WebViewUtils';

export const BillingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const webViewRef = useRef<RNWebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [useDesktopMode, setUseDesktopMode] = useState(false);

  // Load desktop mode setting
  const loadDesktopModeSetting = async () => {
    try {
      const desktopMode = await AsyncStorage.getItem('billing_desktop_mode');
      setUseDesktopMode(desktopMode === 'true');
    } catch (error) {
      console.log('Error loading billing desktop mode setting:', error);
    }
  };

  // Load desktop mode setting on mount
  useEffect(() => {
    loadDesktopModeSetting();
  }, []);

  // Listen for app state changes to refresh settings
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, reload settings
        loadDesktopModeSetting();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Also listen for focus events on navigation
    const unsubscribeFocus = navigation.addListener('focus', () => {
      loadDesktopModeSetting();
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomWebView 
        url="https://billing.circlenetworkbd.net/"
        userAgent={useDesktopMode ? DESKTOP_USER_AGENT : undefined}
        onNavigationStateChange={(back, forward) => {
          setCanGoBack(back);
          setCanGoForward(forward);
        }}
        webViewRef={webViewRef as any}
      />
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
});