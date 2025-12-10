import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useSettingsStore } from './src/store/SettingsStore';
import { Navigation } from './src/navigation/Navigation';
import { SplashScreen } from './src/components/SplashScreen';
import { DownloadManager } from './src/utils/DownloadManager';

SplashScreenExpo.preventAutoHideAsync();

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const { isDark } = useTheme();
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    async function prepare() {
      try {
        await loadSettings();
        
        // Request storage permissions on app startup
        await DownloadManager.requestPermissions();
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        await SplashScreenExpo.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Navigation />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}