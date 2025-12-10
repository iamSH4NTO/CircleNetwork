import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface VideoPlayerScreenProps {
  route: {
    params: {
      videoUrl: string;
      title?: string;
    };
  };
  navigation: any;
}

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({ route, navigation }) => {
  const { videoUrl, title } = route.params;
  const { theme } = useTheme();
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (status?.isLoaded && status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={(status) => setStatus(status)}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading video...
          </Text>
        </View>
      )}

      {title && (
        <View style={[styles.titleBar, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  titleBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});
