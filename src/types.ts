export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    text: string;
    card: string;
    border: string;
    primary: string;
    secondary: string;
    error: string;
    success: string;
  };
}

export interface AppSettings {
  theme: 'light' | 'dark';
  downloadFolderUri: string | null;
}

export interface WebViewNavigationState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}
