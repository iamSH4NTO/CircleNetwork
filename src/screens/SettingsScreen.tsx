import React from "react";
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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useSettingsStore } from "../store/SettingsStore";
import { useDownloadStore } from "../store/DownloadStore";
import { DownloadManager } from "../utils/DownloadManager";

export const SettingsScreen: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { downloadFolderUri, setDownloadFolderUri } = useSettingsStore();
  const { maxThreads, setMaxThreads } = useDownloadStore();

  const getFolderDisplayName = (uri: string | null): string => {
    if (!uri) {
      return "Not selected";
    }

    if (Platform.OS === "android" && uri.startsWith("content://")) {
      try {
        const decodedUri = decodeURIComponent(uri);
        const pathSegment = decodedUri.split("/tree/")[1];
        if (pathSegment) {
          const path = pathSegment.split(":").slice(1).join(":");
          return path || "Selected folder";
        }
      } catch (e) {
        // Fallback for any parsing errors
      }
      return "Selected folder";
    }

    if (uri.startsWith("file://")) {
      const path = uri.replace("file://", "");
      const parts = path.split("/");
      return parts.filter((p) => p).pop() || path;
    }

    return uri;
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

  const handleSelectFolder = async () => {
    const uri = await DownloadManager.selectDownloadFolder();
    if (uri) {
      await setDownloadFolderUri(uri);
      const folderName = getFolderDisplayName(uri);
      Alert.alert("Success", `Download folder selected: ${folderName}`);
    }
  };

  const handleThreadsChange = () => {
    Alert.alert("Download Threads", "Select maximum concurrent downloads", [
      { text: "1 Thread", onPress: () => setMaxThreads(1) },
      { text: "2 Threads", onPress: () => setMaxThreads(2) },
      { text: "3 Threads", onPress: () => setMaxThreads(3) },
      { text: "4 Threads", onPress: () => setMaxThreads(4) },
      { text: "5 Threads", onPress: () => setMaxThreads(5) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDevLink = () => {
    Linking.openURL("https://github.com/iamsh4nto");
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

        {/* Download Section */}
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons
              name="folder"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              Downloads
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleSelectFolder}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Download Folder
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.secondary },
                ]}
                numberOfLines={1}
              >
                {getFolderDisplayName(downloadFolderUri)}
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={theme.colors.secondary}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleThreadsChange}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                Download Threads
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.colors.secondary },
                ]}
              >
                {maxThreads} concurrent download{maxThreads > 1 ? "s" : ""}
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
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },
  devCredit: {
    alignItems: "center",
    paddingVertical: 24,
  },
  devText: {
    fontSize: 14,
  },
});
