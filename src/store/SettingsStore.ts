import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  downloadFolderUri: string | null;
  setDownloadFolderUri: (uri: string | null) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  downloadFolderUri: null,

  setDownloadFolderUri: async (uri: string | null) => {
    try {
      if (uri) {
        await AsyncStorage.setItem('downloadFolderUri', uri);
      } else {
        await AsyncStorage.removeItem('downloadFolderUri');
      }
      set({ downloadFolderUri: uri });
    } catch (error) {
      console.error('Failed to save download folder URI:', error);
    }
  },

  loadSettings: async () => {
    try {
      const uri = await AsyncStorage.getItem('downloadFolderUri');
      set({ downloadFolderUri: uri });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
}));
