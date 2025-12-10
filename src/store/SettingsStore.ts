import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as FileSystem from 'expo-file-system';

interface SettingsState {
  downloadPath: string;
  setDownloadPath: (path: string) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  downloadPath: FileSystem.documentDirectory + 'downloads/',

  setDownloadPath: async (path: string) => {
    try {
      await AsyncStorage.setItem('downloadPath', path);
      set({ downloadPath: path });
    } catch (error) {
      console.error('Failed to save download path:', error);
    }
  },

  loadSettings: async () => {
    try {
      const path = await AsyncStorage.getItem('downloadPath');
      if (path) {
        set({ downloadPath: path });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
}));
