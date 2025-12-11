import React, { useState, useRef, useLayoutEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView as RNWebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { CustomWebView } from '../components/CustomWebView';

export const BillingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const webViewRef = useRef<RNWebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

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
