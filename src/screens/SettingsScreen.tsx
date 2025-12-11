import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  Platform,
  BackHandler,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkGitHubReleases, applyUpdate } from '../utils/UpdateUtils';

// Define external player options
const EXTERNAL_PLAYERS = [
  { id: 'vlc', name: 'VLC Player' },
  { id: 'mxplayer', name: 'MX Player' },
  { id: 'system', name: 'System Player' },
];

export const SettingsScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [preferredPlayer, setPreferredPlayer] = useState<string>('system');
  const [homeDesktopMode, setHomeDesktopMode] = useState<boolean>(false);
  const [billingDesktopMode, setBillingDesktopMode] = useState<boolean>(false);
  const [showHomeReloadButton, setShowHomeReloadButton] = useState<boolean>(true);
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);

  // Load preferred player from storage
  useEffect(() => {
    const loadPreferredPlayer = async () => {
      try {
        const savedPlayer = await AsyncStorage.getItem('preferred_player');
        if (savedPlayer) {
          setPreferredPlayer(savedPlayer);
        }
      } catch (error) {
        console.log('Error loading preferred player:', error);
      }
    };

    loadPreferredPlayer();
  }, []);

  // Load desktop mode settings
  useEffect(() => {
    const loadDesktopModeSettings = async () => {
      try {
        const homeMode = await AsyncStorage.getItem('home_desktop_mode');
        const billingMode = await AsyncStorage.getItem('billing_desktop_mode');
        
        setHomeDesktopMode(homeMode === 'true');
        setBillingDesktopMode(billingMode === 'true');
      } catch (error) {
        console.log('Error loading desktop mode settings:', error);
      }
    };

    loadDesktopModeSettings();
  }, []);

  // Load reload button setting
  useEffect(() => {
    const loadReloadButtonSetting = async () => {
      try {
        const showButton = await AsyncStorage.getItem('show_home_reload_button');
        setShowHomeReloadButton(showButton !== 'false'); // Default to true if not set
      } catch (error) {
        console.log('Error loading reload button setting:', error);
      }
    };

    loadReloadButtonSetting();
  }, []);

  // Save preferred player to storage
  const savePreferredPlayer = async (playerId: string) => {
    try {
      await AsyncStorage.setItem('preferred_player', playerId);
      setPreferredPlayer(playerId);
    } catch (error) {
      console.log('Error saving preferred player:', error);
    }
  };

  // Save desktop mode settings
  const saveDesktopModeSetting = async (setting: 'home' | 'billing', value: boolean) => {
    try {
      if (setting === 'home') {
        await AsyncStorage.setItem('home_desktop_mode', value.toString());
        setHomeDesktopMode(value);
      } else {
        await AsyncStorage.setItem('billing_desktop_mode', value.toString());
        setBillingDesktopMode(value);
      }
    } catch (error) {
      console.log('Error saving desktop mode setting:', error);
    }
  };

  // Save reload button setting
  const saveReloadButtonSetting = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('show_home_reload_button', value.toString());
      setShowHomeReloadButton(value);
    } catch (error) {
      console.log('Error saving reload button setting:', error);
    }
  };

  const handleShareApp = async () => {
    try {
      Alert.alert(
        "Share CircleNetwork",
        "Share this amazing app with your friends!",
        [
          {
            text: "Share",
            onPress: () => {
              console.log("Share app");
            },
            style: "default" as "default"
          },
          { 
            text: "Cancel", 
            style: "cancel" as "cancel" 
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleDevLink = () => {
    Linking.openURL("https://github.com/iamsh4nto");
  };

  // Show player selection dialog
  const showPlayerSelectionDialog = () => {
    const currentPlayer = EXTERNAL_PLAYERS.find(p => p.id === preferredPlayer);
    
    Alert.alert(
      'Default Video Player',
      `Current: ${currentPlayer?.name || 'System Player'}\n\nSelect your preferred video player for streaming:`,
      [
        ...EXTERNAL_PLAYERS.map((player) => ({
          text: player.name,
          onPress: () => savePreferredPlayer(player.id),
          style: "default" as "default"
        })),
        { 
          text: 'Cancel', 
          style: 'cancel' as 'cancel' 
        }
      ],
      { cancelable: true }
    );
  };

  // Handle app exit
  const handleExitApp = () => {
    Alert.alert(
      "Exit App",
      "Are you sure you want to exit CircleNetwork?",
      [
        {
          text: "Cancel",
          style: "cancel" as "cancel"
        },
        {
          text: "Exit",
          style: "destructive" as "destructive",
          onPress: () => BackHandler.exitApp()
        }
      ],
      { cancelable: true }
    );
  };

  // Check for updates manually
  const handleCheckForUpdates = async () => {
    try {
      const { updateAvailable, latestVersion, releaseInfo } = await checkGitHubReleases();
      
      if (updateAvailable && releaseInfo) {
        setDownloadUrl(releaseInfo.browser_download_url);
        Alert.alert(
          'Update Available',
          `A new version (${latestVersion}) of CircleNetwork is available. Would you like to download it now?`,
          [
            {
              text: 'Update Now',
              onPress: () => applyUpdate(releaseInfo.browser_download_url),
              style: 'default' as 'default'
            },
            {
              text: 'Later',
              style: 'cancel' as 'cancel'
            }
          ],
          { cancelable: true }
        );
      } else {
        Alert.alert(
          'Up to Date',
          'You are using the latest version of CircleNetwork.',
          [{ text: 'OK', style: 'default' as 'default' }],
          { cancelable: true }
        );
      }
    } catch (error) {
      Alert.alert(
        'Update Check Failed',
        'Unable to check for updates. Please check your internet connection and try again.',
        [{ text: 'OK', style: 'default' as 'default' }],
        { cancelable: true }
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.content}>
        {/* Theme Section - Simplified */}
        <TouchableOpacity 
          style={[styles.simpleCard, { backgroundColor: theme.colors.card }]}
          onPress={toggleTheme}
        >
          <View style={styles.simpleRow}>
            <MaterialIcons
              name={isDark ? "dark-mode" : "light-mode"}
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.simpleLabel, { color: theme.colors.text }]}>
              {isDark ? "Dark Mode" : "Light Mode"}
            </Text>
            <View style={styles.spacer} />
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.secondary}
            />
          </View>
        </TouchableOpacity>

        {/* Desktop Mode Section */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="computer"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Desktop Mode
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Home Screen
            </Text>
            <Switch
              value={homeDesktopMode}
              onValueChange={(value) => saveDesktopModeSetting('home', value)}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingRow, styles.bottomRow]}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Billing Screen
            </Text>
            <Switch
              value={billingDesktopMode}
              onValueChange={(value) => saveDesktopModeSetting('billing', value)}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* UI Customization Section */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name="visibility"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              UI Customization
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Show Reload Button
            </Text>
            <Switch
              value={showHomeReloadButton}
              onValueChange={saveReloadButtonSetting}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Player Settings */}
        <TouchableOpacity 
          style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}
          onPress={showPlayerSelectionDialog}
        >
          <View style={styles.settingRow}>
            <MaterialIcons
              name="video-library"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.settingLabel, { color: theme.colors.text, flex: 1, marginLeft: 8 }]}>
              Video Player
            </Text>
            <Text style={[styles.settingValue, { color: theme.colors.secondary }]}>
              {EXTERNAL_PLAYERS.find(p => p.id === preferredPlayer)?.name || 'System Player'}
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.secondary}
            />
          </View>
        </TouchableOpacity>

        {/* Check for Updates */}
        <TouchableOpacity 
          style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}
          onPress={handleCheckForUpdates}
        >
          <View style={styles.settingRow}>
            <MaterialIcons
              name="system-update"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.settingLabel, { color: theme.colors.text, flex: 1, marginLeft: 8 }]}>
              Check for Updates
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.secondary}
            />
          </View>
        </TouchableOpacity>

        {/* Share Section */}
        <TouchableOpacity 
          style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}
          onPress={handleShareApp}
        >
          <View style={styles.settingRow}>
            <MaterialIcons
              name="share"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={[styles.settingLabel, { color: theme.colors.text, flex: 1, marginLeft: 8 }]}>
              Share App
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.secondary}
            />
          </View>
        </TouchableOpacity>

        {/* Exit App Section */}
        <TouchableOpacity 
          style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}
          onPress={handleExitApp}
        >
          <View style={styles.settingRow}>
            <MaterialIcons
              name="exit-to-app"
              size={20}
              color={theme.colors.error}
            />
            <Text style={[styles.settingLabel, { color: theme.colors.error, flex: 1, marginLeft: 8 }]}>
              Exit App
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.secondary}
            />
          </View>
        </TouchableOpacity>

        {/* Developer Credit */}
        <TouchableOpacity style={styles.devCredit} onPress={handleDevLink}>
          <Text style={[styles.devText, { color: theme.colors.secondary }]}>
            DEV:{" "}
            <Text style={{ color: theme.colors.primary }}>
              https://Github.com/iamsh4nto
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  content: {
    padding: 16,
  },
  simpleCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  simpleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  simpleLabel: {
    fontSize: 18,
    fontWeight: "500",
    marginLeft: 12,
  },
  sectionCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bottomRow: {
    paddingBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 14,
    marginRight: 8,
  },
  spacer: {
    flex: 1,
  },
  devCredit: {
    alignItems: "center",
    paddingVertical: 24,
  },
  devText: {
    fontSize: 14,
  },
});