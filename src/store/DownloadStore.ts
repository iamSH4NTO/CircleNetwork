import { create } from 'zustand';
import { DownloadItem } from '../types/download';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useSettingsStore } from './SettingsStore';

interface DownloadState {
  downloads: DownloadItem[];
  maxThreads: number;
  activeDownloads: number;
  downloadTasks: Map<string, FileSystem.DownloadResumable>;
  addDownload: (url: string, filename: string) => Promise<void>;
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
  removeDownload: (id: string) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  setMaxThreads: (threads: number) => Promise<void>;
  loadDownloads: () => Promise<void>;
  saveDownloads: () => Promise<void>;
  startDownload: (item: DownloadItem) => Promise<void>;
  setDownloadTask: (id: string, task: FileSystem.DownloadResumable) => void;
  clearDownloadTask: (id: string) => void;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  maxThreads: 3,
  activeDownloads: 0,
  downloadTasks: new Map(),
  _startNextDownload: () => {
    const { downloads, activeDownloads, maxThreads, startDownload } = get();
    if (activeDownloads >= maxThreads) {
      return;
    }

    const queuedDownload = downloads.find((d) => d.status === 'queued');
    if (queuedDownload) {
      set((state) => ({
        downloads: state.downloads.map((d) =>
          d.id === queuedDownload.id ? { ...d, status: 'downloading' } : d
        ),
        activeDownloads: state.activeDownloads + 1,
      }));
      startDownload(queuedDownload);
    }
  },

  addDownload: async (url: string, filename: string) => {
    const { downloadPath } = useSettingsStore.getState();

    const newDownload: DownloadItem = {
      id: Date.now().toString(),
      url,
      filename,
      fileSize: 0,
      downloadedSize: 0,
      progress: 0,
      status: 'queued',
      startTime: Date.now(),
      localPath: `${downloadPath}/${filename}`,
    };

    set((state) => ({
      downloads: [newDownload, ...state.downloads],
    }));

    get()._startNextDownload();
    get().saveDownloads();
  },

  startDownload: async (item: DownloadItem) => {
    const progressCallback = ({ totalBytesWritten, totalBytesExpectedToWrite }: { totalBytesWritten: number, totalBytesExpectedToWrite: number }) => {
      const progress = (totalBytesWritten / totalBytesExpectedToWrite) * 100;
      get().updateDownload(item.id, {
        progress,
        downloadedSize: totalBytesWritten,
        fileSize: totalBytesExpectedToWrite,
      });
    };

    let downloadResumable;
    if (item.resumeData) {
      try {
        const resumeData = JSON.parse(item.resumeData);
        downloadResumable = new FileSystem.DownloadResumable(
          item.url,
          item.localPath!,
          {},
          progressCallback,
          resumeData
        );
      } catch (e) {
        console.error("Couldn't resume download:", e);
      }
    }

    if (!downloadResumable) {
      downloadResumable = FileSystem.createDownloadResumable(
        item.url,
        item.localPath!,
        {},
        progressCallback
      );
    }

    get().setDownloadTask(item.id, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      if (result) {
        get().updateDownload(item.id, {
          status: 'completed',
          endTime: Date.now(),
          fileSize: result.size,
          localPath: result.uri,
        });
        set((state) => ({ activeDownloads: Math.max(0, state.activeDownloads - 1) }));
      }
    } catch (error: any) {
      console.error('Download error:', error);
      get().updateDownload(item.id, { status: 'failed', error: error.message });
      set((state) => ({ activeDownloads: Math.max(0, state.activeDownloads - 1) }));
    } finally {
      get().clearDownloadTask(item.id);
      get()._startNextDownload();
      get().saveDownloads();
    }
  },

  updateDownload: (id: string, updates: Partial<DownloadItem>) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
    get().saveDownloads();
  },

  removeDownload: async (id: string) => {
    const { downloads, downloadTasks } = get();
    const download = downloads.find((d) => d.id === id);
    if (!download) return;

    const task = downloadTasks.get(id);
    if (task) {
      try {
        await task.cancelAsync();
      } catch (error) {
        console.warn('Failed to cancel download task on remove:', error);
      }
      get().clearDownloadTask(id);
    }

    if (download.localPath) {
      try {
        await FileSystem.deleteAsync(download.localPath, { idempotent: true });
      } catch (error) {
        console.warn('Failed to delete file on remove:', error);
      }
    }

    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== id),
      activeDownloads: download.status === 'downloading'
        ? Math.max(0, state.activeDownloads - 1)
        : state.activeDownloads,
    }));
    get().saveDownloads();
  },

  pauseDownload: async (id: string) => {
    const task = get().downloadTasks.get(id);
    if (task) {
      try {
        const resumeData = await task.pauseAsync();
        get().updateDownload(id, { status: 'paused', resumeData: JSON.stringify(resumeData) });
        set((state) => ({ activeDownloads: Math.max(0, state.activeDownloads - 1) }));
        get().saveDownloads();
      } catch (error) {
        console.error('Failed to pause download:', error);
        get().updateDownload(id, { status: 'failed', error: 'Failed to pause' });
      }
    }
  },

  resumeDownload: async (id: string) => {
    const download = get().downloads.find((d) => d.id === id);
    if (download && download.status === 'paused') {
      set((state) => ({
        downloads: state.downloads.map((d) =>
          d.id === id ? { ...d, status: 'downloading' } : d
        ),
        activeDownloads: state.activeDownloads + 1,
      }));
      await get().startDownload(download);
    }
  },

  cancelDownload: async (id: string) => {
    const task = get().downloadTasks.get(id);
    if (task) {
      try {
        await task.cancelAsync();
      } catch (error) {
        console.error('Failed to cancel download:', error);
      }
    }
    get().updateDownload(id, { status: 'cancelled', endTime: Date.now() });
    set((state) => ({ activeDownloads: Math.max(0, state.activeDownloads - 1) }));
    get().clearDownloadTask(id);
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
        let downloads: DownloadItem[] = JSON.parse(downloadsData);

        // Mark active downloads as paused, since they were interrupted
        downloads = downloads.map(d =>
          d.status === 'downloading' ? { ...d, status: 'paused' } : d
        );

        set({ downloads, activeDownloads: 0 });
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