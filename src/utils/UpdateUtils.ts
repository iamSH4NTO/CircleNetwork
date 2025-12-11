import Constants from 'expo-constants';
import { Linking } from 'react-native';

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  browser_download_url: string;
  published_at: string;
}

export const getCurrentAppVersion = (): string => {
  // Try to get version from different sources
  return (
    Constants.expoConfig?.version ||
    '1.0.0'
  );
};

export const checkGitHubReleases = async (): Promise<{
  updateAvailable: boolean;
  latestVersion?: string;
  releaseInfo?: GitHubRelease;
}> => {
  try {
    const response = await fetch(
      'https://api.github.com/repos/iamSH4NTO/CircleNetwork/releases/latest'
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API request failed with status ${response.status}`);
    }
    
    const release: GitHubRelease = await response.json();
    const currentVersion = getCurrentAppVersion();
    const latestVersion = release.tag_name.replace('v', ''); // Remove 'v' prefix if present
    
    // Simple version comparison (assuming semantic versioning)
    const isUpdateAvailable = compareVersions(latestVersion, currentVersion) > 0;
    
    return {
      updateAvailable: isUpdateAvailable,
      latestVersion,
      releaseInfo: release,
    };
  } catch (error) {
    console.error('Error checking GitHub releases:', error);
    throw error;
  }
};

export const applyUpdate = async (browserDownloadUrl?: string): Promise<void> => {
  try {
    // Use the browser download URL if provided, otherwise fallback to releases page
    const url = browserDownloadUrl || 'https://github.com/iamSH4NTO/CircleNetwork/releases/latest';
    await Linking.openURL(url);
  } catch (error) {
    console.error('Error applying update:', error);
    throw error;
  }
};

// Simple version comparison function
const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
};