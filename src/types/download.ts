export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  fileSize: number;
  downloadedSize: number;
  progress: number;
  status: 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  error?: string;
  localPath?: string;
}

export interface DownloadSettings {
  maxThreads: number;
  downloadPath: string | null;
}
