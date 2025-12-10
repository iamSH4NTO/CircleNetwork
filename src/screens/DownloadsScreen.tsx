import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useDownloadStore } from '../store/DownloadStore';
import { DownloadItem } from '../types/download';
import { Linking } from 'react-native';

export const DownloadsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { downloads, pauseDownload, resumeDownload, cancelDownload, removeDownload, loadDownloads } = useDownloadStore();

  useEffect(() => {
    loadDownloads();
  }, []);

  const handlePause = async (id: string) => {
    await pauseDownload(id);
  };

  const handleResume = async (id: string) => {
    await resumeDownload(id);
  };

  const handleCancel = async (id: string) => {
    Alert.alert(
      'Cancel Download',
      'Are you sure you want to cancel this download?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => await cancelDownload(id),
          style: 'destructive',
        },
      ]
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Download',
      'Are you sure you want to delete this item?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => removeDownload(id),
          style: 'destructive',
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: DownloadItem['status']) => {
    switch (status) {
      case 'downloading':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success;
      case 'paused':
        return theme.colors.secondary;
      case 'failed':
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.text;
    }
  };

  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'downloading':
        return 'downloading';
      case 'completed':
        return 'check-circle';
      case 'paused':
        return 'pause-circle-filled';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help';
    }
  };

  const renderDownloadItem = ({ item }: { item: DownloadItem }) => (
    <View style={[styles.downloadItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.downloadHeader}>
        <MaterialIcons
          name={getStatusIcon(item.status)}
          size={24}
          color={getStatusColor(item.status)}
        />
        <View style={styles.downloadInfo}>
          <Text style={[styles.filename, { color: theme.colors.text }]} numberOfLines={1}>
            {item.filename}
          </Text>
          <Text style={[styles.fileSize, { color: theme.colors.secondary }]}>
            {item.fileSize > 0 ? `${formatFileSize(item.downloadedSize)} / ${formatFileSize(item.fileSize)}` : 'Unknown size'}
          </Text>
          {item.localPath && (
            <Text style={[styles.fileSize, { color: theme.colors.secondary }]} numberOfLines={1}>
              {item.localPath}
            </Text>
          )}
        </View>
      </View>

      {item.status === 'downloading' && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.colors.primary, width: `${item.progress}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.secondary }]}>
            {item.progress.toFixed(1)}%
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {item.status === 'downloading' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
              onPress={() => handlePause(item.id)}
            >
              <MaterialIcons name="pause" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
              onPress={() => handleCancel(item.id)}
            >
              <MaterialIcons name="cancel" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'paused' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleResume(item.id)}
            >
              <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
              onPress={() => handleCancel(item.id)}
            >
              <MaterialIcons name="cancel" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'completed' && item.localPath && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => Linking.openURL(item.localPath!)}
          >
            <MaterialIcons name="open-in-new" size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Open</Text>
          </TouchableOpacity>
        )}

        {(item.status === 'completed' || item.status === 'cancelled' || item.status === 'failed') && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
            onPress={() => handleDelete(item.id)}
          >
            <MaterialIcons name="delete" size={20} color="#FFFFFF" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {downloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="download" size={64} color={theme.colors.secondary} />
          <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
            No downloads yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={downloads}
          renderItem={renderDownloadItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  downloadItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  downloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  downloadInfo: {
    flex: 1,
    marginLeft: 12,
  },
  filename: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
  },
});
