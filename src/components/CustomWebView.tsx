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
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  };

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
        isVideo ? 'Video File' : 'Media File',
        'What would you like to do?',
        [
          {
            text: isVideo ? 'Stream' : 'Open',
            onPress: () => {
              if (isVideo && onStreamVideo) {
                onStreamVideo(url, filename);
              } else {
                Linking.openURL(url);
              }
            },
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
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      
      return false;
    }
    
    return true;
  };

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
          Connect Circle Network Internet
        </Text>
      </ScrollView>
    );
  }

  if (error) {
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

  return (
    <View style={styles.container}>
      <RNWebView
        ref={webViewRef}
        source={{ uri: url }}
        userAgent={userAgent}
        onLoadStart={() => {
          if (isFirstLoad) {
            setLoading(true);
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            loadingTimeoutRef.current = setTimeout(() => {
              setLoading(false);
            }, 3000);
          }
        }}
        onLoadEnd={() => {
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setLoading(false);
          setIsFirstLoad(false);
        }}
        onError={() => {
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setLoading(false);
          setError(true);
          setIsFirstLoad(false);
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
        <View style={[styles.loadingBar, { backgroundColor: theme.colors.primary }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingVertical: 8,
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