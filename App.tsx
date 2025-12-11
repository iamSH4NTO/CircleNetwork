import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { useSettingsStore } from './src/store/SettingsStore';
import { Navigation } from './src/navigation/Navigation';
import { SplashScreen } from './src/components/SplashScreen';
import { UpdateChecker } from './src/components/UpdateChecker';

SplashScreenExpo.preventAutoHideAsync();

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [updateCheckComplete, setUpdateCheckComplete] = useState(false);
  const { isDark } = useTheme();
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    async function prepare() {
      try {
        await loadSettings();
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

  if (!updateCheckComplete) {
    return <UpdateChecker onCheckComplete={() => setUpdateCheckComplete(true)} />;
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