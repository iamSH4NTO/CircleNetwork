import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  loadSettings: async () => {
    try {
      // Load any other settings here if needed in the future
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
}));
