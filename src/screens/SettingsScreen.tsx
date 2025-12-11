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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define external player options
const EXTERNAL_PLAYERS = [
  { id: 'vlc', name: 'VLC Player' },
  { id: 'mxplayer', name: 'MX Player' },
  { id: 'system', name: 'System Player' },
];

export const SettingsScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [preferredPlayer, setPreferredPlayer] = useState<string>('system');

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

  // Save preferred player to storage
  const savePreferredPlayer = async (playerId: string) => {
    try {
      await AsyncStorage.setItem('preferred_player', playerId);
      setPreferredPlayer(playerId);
    } catch (error) {
      console.log('Error saving preferred player:', error);
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
          },
          { text: "Cancel", style: "cancel" },
        ],
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
          isPreferred: player.id === preferredPlayer
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        {/* Theme Section */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons
              name="palette"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Appearance
            </Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Dark Mode
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.secondary },
                ]}
              >
                {isDark ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Player Settings */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons
              name="video-library"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Video Player
            </Text>
          </View>

          <TouchableOpacity style={styles.settingRow} onPress={showPlayerSelectionDialog}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Default Player
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.secondary },
                ]}
              >
                {EXTERNAL_PLAYERS.find(p => p.id === preferredPlayer)?.name || 'System Player'}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Share Section */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons
              name="share"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Share
            </Text>
          </View>

          <TouchableOpacity style={styles.settingRow} onPress={handleShareApp}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Share App
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.secondary },
                ]}
              >
                Tell your friends about CircleNetwork
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.secondary}
            />
          </TouchableOpacity>
        </View>

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
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  devCredit: {
    alignItems: "center",
    paddingVertical: 24,
  },
  devText: {
    fontSize: 14,
  },
});