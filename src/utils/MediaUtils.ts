export const isMediaFile = (url: string): boolean => {
  const mediaExtensions = [
    '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v',
    '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
    '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz',
    '.exe', '.apk', '.dmg', '.iso',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  ];
  
  const urlLower = url.toLowerCase();
  return mediaExtensions.some(ext => urlLower.includes(ext));
};

export const isVideoFile = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
  const urlLower = url.toLowerCase();
  return videoExtensions.some(ext => urlLower.includes(ext));
};

export const getFileExtension = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  } catch {
    return '';
  }
};
