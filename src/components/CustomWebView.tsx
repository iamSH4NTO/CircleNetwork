import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../context/ThemeContext';
import { shouldOpenInBrowser } from '../utils/WebViewUtils';

interface CustomWebViewProps {
  url: string;
  userAgent?: string;
  onUrlChange?: (url: string) => void;
  onNavigationStateChange?: (canGoBack: boolean, canGoForward: boolean) => void;
  webViewRef?: React.RefObject<RNWebView>;
  onStreamVideo?: (url: string, title: string) => void;
}

export const CustomWebView: React.FC<CustomWebViewProps> = ({
  url,
  userAgent,
  onUrlChange,
  onNavigationStateChange,
  webViewRef: externalWebViewRef,
  onStreamVideo,
}) => {
  const internalWebViewRef = useRef<RNWebView>(null);
  const webViewRef = externalWebViewRef || internalWebViewRef;
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setError(false);
    setIsFirstLoad(true);
    setLoadProgress(0);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // New function to check if we should show the Circle Network error message
  const shouldShowCircleNetworkError = () => {
    // Show the specific error message when:
    // 1. We're online but still getting an error (likely DNS or connection issue)
    // 2. This is the first load attempt
    return isOnline && error && isFirstLoad;
  };

  if (shouldShowCircleNetworkError()) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={[styles.offlineText, { color: theme.colors.text }]}>
          Please connect to Circle Network internet
        </Text>
        <Text style={[styles.offlineSubtext, { color: theme.colors.secondary }]}>
          This page failed to load. Please check your internet connection.
        </Text>
      </ScrollView>
    );
  }

  // Simplified offline handling - just show the same Circle Network message
  if (!isOnline) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={[styles.offlineText, { color: theme.colors.text }]}>
          Please connect to Circle Network internet
        </Text>
        <Text style={[styles.offlineSubtext, { color: theme.colors.secondary }]}>
          No internet connection detected.
        </Text>
      </ScrollView>
    );
  }

  // Generic error handling for other cases
  if (error && !isFirstLoad) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Failed to load page
        </Text>
        <Text style={[styles.errorSubtext, { color: theme.colors.secondary }]}>
          Pull down to retry
        </Text>
      </ScrollView>
    );
  }

  const handleNavigationStateChange = (navState: any) => {
    if (onNavigationStateChange) {
      onNavigationStateChange(navState.canGoBack, navState.canGoForward);
    }
    
    if (shouldOpenInBrowser(navState.url)) {
      webViewRef.current?.stopLoading();
      Linking.openURL(navState.url);
      return false;
    }
    if (onUrlChange && navState.url) {
      onUrlChange(navState.url);
    }
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;
    
    if (shouldOpenInBrowser(url)) {
      Linking.openURL(url);
      return false;
    }
    
    // Check if it's a media file
    const mediaExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mp3', '.wav', '.pdf', '.zip', '.rar', '.apk'];
    const isMedia = mediaExtensions.some(ext => url.toLowerCase().includes(ext));
    
    if (isMedia) {
      webViewRef.current?.stopLoading();
      
      const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'].some(ext => url.toLowerCase().includes(ext));
      const filename = url.split('/').pop() || 'file';
      
      Alert.alert(
        isVideo ? 'Video File Detected' : 'Media File Detected',
        `What would you like to do with "${filename}"?`,
        [
          {
            text: isVideo ? 'Stream Video' : 'Open File',
            onPress: () => {
              if (isVideo && onStreamVideo) {
                onStreamVideo(url, filename);
              } else {
                Linking.openURL(url);
              }
            },
            style: 'default' as 'default'
          },
          {
            text: 'Download',
            onPress: () => {
              // Use the system download manager
              if (Platform.OS === 'android') {
                // For Android, we can use the download attribute or let the system handle it
                Linking.openURL(url);
              } else {
                // For iOS, open in browser which will handle the download
                Linking.openURL(url);
              }
            },
            style: 'default' as 'default'
          },
          {
            text: 'Cancel',
            style: 'cancel' as 'cancel'
          }
        ],
        { cancelable: true }
      );
      
      return false;
    }
    
    return true;
  };

  return (
    <View style={styles.container}>
      <RNWebView
        ref={webViewRef}
        source={{ uri: url }}
        userAgent={userAgent}
        onLoadStart={() => {
          if (isFirstLoad) {
            setLoading(true);
            setLoadProgress(0);
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            // Set a reasonable timeout for initial load
            loadingTimeoutRef.current = setTimeout(() => {
              if (isFirstLoad) {
                setLoading(false);
                setError(true);
              }
            }, 15000); // 15 seconds timeout
          }
        }}
        onLoadProgress={({ nativeEvent }) => {
          setLoadProgress(nativeEvent.progress);
        }}
        onLoadEnd={() => {
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setLoading(false);
          setIsFirstLoad(false);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView error:', nativeEvent);
          
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setLoading(false);
          setError(true);
          setIsFirstLoad(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('HTTP error:', nativeEvent.statusCode, nativeEvent.url);
          
          // Only show error for significant HTTP errors
          if (nativeEvent.statusCode >= 400 && isFirstLoad) {
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            setLoading(false);
            setError(true);
            setIsFirstLoad(false);
          }
        }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        setSupportMultipleWindows={false}
        minimumFontSize={1}
        injectedJavaScript={userAgent ? `
          (function() {
            // Remove all existing viewport meta tags
            var metas = document.querySelectorAll('meta[name="viewport"]');
            for (var i = 0; i < metas.length; i++) {
              metas[i].remove();
            }
            
            // Add desktop viewport
            var meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=1280';
            document.head.appendChild(meta);
            
            // Force desktop styles
            document.body.style.minWidth = '1280px';
          })();
          true;
        ` : undefined}
        style={{ backgroundColor: theme.colors.background }}
        // Enable download detection for Android
        {...(Platform.OS === 'android' ? {
          onDownloadStart: (syntheticEvent: { nativeEvent: { downloadUrl: string } }) => {
            const { nativeEvent } = syntheticEvent;
            Linking.openURL(nativeEvent.downloadUrl);
          }
        } : {})}
      />
      {loading && isFirstLoad && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background }]}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text, marginTop: 16 }]}>
              Loading website...
            </Text>
            {loadProgress > 0 && (
              <Text style={[styles.loadingText, { color: theme.colors.secondary, fontSize: 14, marginTop: 8 }]}>
                {Math.round(loadProgress * 100)}% loaded
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  offlineText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  offlineSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});