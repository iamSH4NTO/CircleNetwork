export const DESKTOP_USER_AGENT = 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const isExternalLink = (url: string, baseUrl: string): boolean => {
  try {
    const urlObj = new URL(url);
    const baseUrlObj = new URL(baseUrl);
    return urlObj.hostname !== baseUrlObj.hostname;
  } catch {
    return false;
  }
};

export const shouldOpenInBrowser = (url: string): boolean => {
  const externalPatterns = [
    /^mailto:/,
    /^tel:/,
    /^sms:/,
    /^whatsapp:/,
    /^fb:/,
    /^twitter:/,
  ];
  
  return externalPatterns.some(pattern => pattern.test(url));
};
