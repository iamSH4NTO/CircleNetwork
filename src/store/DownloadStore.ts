import { create } from 'zustand';
import { DownloadItem } from '../types/download';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DownloadState {
  downloads: DownloadItem[];
  maxThreads: number;
  activeDownloads: number;
  downloadTasks: Map<string, any>; // Store references to download tasks
  
  addDownload: (url: string, filename: string) => void;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  setMaxThreads: (threads: number) => Promise<void>;
  loadDownloads: () => Promise<void>;
  saveDownloads: () => Promise<void>;
  setDownloadTask: (id: string, task: any) => void;
  clearDownloadTask: (id: string) => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  maxThreads: 3,
  activeDownloads: 0,
  downloadTasks: new Map(),
  
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
    // Cancel the download if it's active
    const { downloadTasks } = get();
    const task = downloadTasks.get(id);
    if (task) {
      try {
        task.cancel();
      } catch (error) {
        console.warn('Failed to cancel download task:', error);
      }
      get().clearDownloadTask(id);
    }
    
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id),
    }));
    get().saveDownloads();
  },

  pauseDownload: (id: string) => {
    // Pause the download task if it exists
    const { downloadTasks } = get();
    const task = downloadTasks.get(id);
    if (task) {
      try {
        task.pause();
      } catch (error) {
        console.warn('Failed to pause download task:', error);
      }
    }
    
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, status: 'paused' } : d
      ),
      activeDownloads: Math.max(0, state.activeDownloads - 1),
    }));
    get().saveDownloads();
  },

  resumeDownload: (id: string) => {
    // Resume the download task if it exists
    const { downloadTasks } = get();
    const task = downloadTasks.get(id);
    if (task) {
      try {
        task.resume();
      } catch (error) {
        console.warn('Failed to resume download task:', error);
      }
    }
    
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, status: 'downloading' } : d
      ),
      activeDownloads: state.activeDownloads + 1,
    }));
    get().saveDownloads();
  },

  cancelDownload: (id: string) => {
    // Cancel the download task if it exists
    const { downloadTasks } = get();
    const task = downloadTasks.get(id);
    if (task) {
      try {
        task.cancel();
      } catch (error) {
        console.warn('Failed to cancel download task:', error);
      }
      get().clearDownloadTask(id);
    }
    
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, status: 'cancelled' } : d
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

  setDownloadTask: (id: string, task: any) => {
    set((state) => {
      const newTasks = new Map(state.downloadTasks);
      newTasks.set(id, task);
      return { downloadTasks: newTasks };
    });
  },

  clearDownloadTask: (id: string) => {
    set((state) => {
      const newTasks = new Map(state.downloadTasks);
      newTasks.delete(id);
      return { downloadTasks: newTasks };
    });
  },
}));