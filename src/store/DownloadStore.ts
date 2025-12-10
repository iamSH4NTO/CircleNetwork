import { create } from 'zustand';
import { DownloadItem } from '../types/download';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DownloadState {
  downloads: DownloadItem[];
  maxThreads: number;
  activeDownloads: number;
  
  addDownload: (url: string, filename: string) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  setMaxThreads: (threads: number) => Promise<void>;
  loadDownloads: () => Promise<void>;
  saveDownloads: () => Promise<void>;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  maxThreads: 3,
  activeDownloads: 0,

  addDownload: (url: string, filename: string) => {
    const newDownload: DownloadItem = {
      id: Date.now().toString(),
      url,
      filename,
      fileSize: 0,
      downloadedSize: 0,
      progress: 0,
      status: 'downloading',
      startTime: Date.now(),
    };
    
    set((state) => ({
      downloads: [newDownload, ...state.downloads],
      activeDownloads: state.activeDownloads + 1,
    }));
    
    get().saveDownloads();
  },

  updateDownload: (id: string, updates: Partial<DownloadItem>) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
    get().saveDownloads();
  },

  removeDownload: (id: string) => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id),
    }));
    get().saveDownloads();
  },

  pauseDownload: (id: string) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, status: 'paused' as const } : d
      ),
      activeDownloads: Math.max(0, state.activeDownloads - 1),
    }));
    get().saveDownloads();
  },

  resumeDownload: (id: string) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, status: 'downloading' as const } : d
      ),
      activeDownloads: state.activeDownloads + 1,
    }));
    get().saveDownloads();
  },

  cancelDownload: (id: string) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, status: 'cancelled' as const } : d
      ),
      activeDownloads: Math.max(0, state.activeDownloads - 1),
    }));
    get().saveDownloads();
  },

  setMaxThreads: async (threads: number) => {
    set({ maxThreads: threads });
    try {
      await AsyncStorage.setItem('maxDownloadThreads', threads.toString());
    } catch (error) {
      console.error('Failed to save max threads:', error);
    }
  },

  loadDownloads: async () => {
    try {
      const [downloadsData, threadsData] = await Promise.all([
        AsyncStorage.getItem('downloads'),
        AsyncStorage.getItem('maxDownloadThreads'),
      ]);
      
      if (downloadsData) {
        const downloads = JSON.parse(downloadsData);
        const activeDownloads = downloads.filter(
          (d: DownloadItem) => d.status === 'downloading'
        ).length;
        set({ downloads, activeDownloads });
      }
      
      if (threadsData) {
        set({ maxThreads: parseInt(threadsData, 10) });
      }
    } catch (error) {
      console.error('Failed to load downloads:', error);
    }
  },

  saveDownloads: async () => {
    try {
      const { downloads } = get();
      await AsyncStorage.setItem('downloads', JSON.stringify(downloads));
    } catch (error) {
      console.error('Failed to save downloads:', error);
    }
  },
}));
