import React, { useEffect } from 'react';
import { Linking, Alert, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VideoPlayerScreenProps {
  route: {
    params: {
      videoUrl: string;
      title?: string;
    };
  };
  navigation: any;
}

// Define external player options
const EXTERNAL_PLAYERS = [
  { id: 'vlc', name: 'VLC Player', scheme: 'vlc://' },
  { id: 'mxplayer', name: 'MX Player', scheme: 'mxplayer://' },
  { id: 'system', name: 'System Player', scheme: '' },
];

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({ route, navigation }) => {
  const { videoUrl } = route.params;

  // Load preferred player and open video immediately
  useEffect(() => {
    // Hide the header immediately
    navigation.setOptions({
      headerShown: false,
    });

    const openVideoWithPreferredPlayer = async () => {
      try {
        // Get preferred player from storage
        const savedPlayer = await AsyncStorage.getItem('preferred_player');
        const playerToUse = savedPlayer || 'system';
        
        let success = false;
        
        if (playerToUse === 'system') {
          // Use system default player
          success = await Linking.openURL(videoUrl);
        } else {
          // Try to open with specific player
          const player = EXTERNAL_PLAYERS.find(p => p.id === playerToUse);
          if (player) {
            const playerUrl = player.scheme + videoUrl;
            try {
              success = await Linking.openURL(playerUrl);
            } catch {
              // If specific player fails, fall back to system player
              success = await Linking.openURL(videoUrl);
            }
          }
        }
        
        if (!success) {
          Alert.alert(
            'Connection Error',
            'Could not open video in external player. Please check your internet connection and try again.',
            [
              {
                text: 'OK',
                style: 'default'
              }
            ],
            { cancelable: true }
          );
        }
      } catch (error) {
        console.log('Error opening in external player:', error);
        Alert.alert(
          'Player Error',
          'An unexpected error occurred while trying to open the video player.',
          [
            {
              text: 'OK',
              style: 'default'
            }
          ],
          { cancelable: true }
        );
      } finally {
        // Navigate back immediately after attempting to open
        navigation.goBack();
      }
    };

    // If no preferred player is set, show selection dialog first
    const checkAndOpenVideo = async () => {
      try {
        const savedPlayer = await AsyncStorage.getItem('preferred_player');
        if (!savedPlayer) {
          // Show player selection dialog
          showPlayerSelectionDialog();
        } else {
          // Open video directly
          openVideoWithPreferredPlayer();
        }
      } catch (error) {
        console.log('Error checking preferred player:', error);
        // Open video with system player as fallback
        openVideoWithPreferredPlayer();
      }
    };

    checkAndOpenVideo();
  }, [videoUrl, navigation]);

  // Show player selection dialog
  const showPlayerSelectionDialog = () => {
    Alert.alert(
      'Choose Video Player',
      'Select your preferred video player for future videos:',
      [
        ...EXTERNAL_PLAYERS.map((player) => ({
          text: player.name,
          onPress: () => {
            savePreferredPlayer(player.id);
            openVideoWithSelectedPlayer(player.id);
          },
          style: 'default' as 'default'
        })),
        {
          text: 'Cancel',
          style: 'cancel' as 'cancel',
          onPress: () => {
            // Even if cancelled, still try to open with system player
            openVideoWithSelectedPlayer('system');
          }
        }
      ],
      { cancelable: true }
    );
  };

  // Save preferred player to storage
  const savePreferredPlayer = async (playerId: string) => {
    try {
      await AsyncStorage.setItem('preferred_player', playerId);
    } catch (error) {
      console.log('Error saving preferred player:', error);
    }
  };

  // Open video with selected player
  const openVideoWithSelectedPlayer = async (playerId: string) => {
    try {
      let success = false;
      
      if (playerId === 'system') {
        // Use system default player
        success = await Linking.openURL(videoUrl);
      } else {
        // Try to open with specific player
        const player = EXTERNAL_PLAYERS.find(p => p.id === playerId);
        if (player) {
          const playerUrl = player.scheme + videoUrl;
          try {
            success = await Linking.openURL(playerUrl);
          } catch {
            // If specific player fails, fall back to system player
            success = await Linking.openURL(videoUrl);
          }
        }
      }
      
      if (!success) {
        Alert.alert(
          'Connection Error',
          'Could not open video in external player. Please check your internet connection and try again.',
          [
            {
              text: 'OK',
              style: 'default'
            }
          ],
          { cancelable: true }
        );
      }
    } catch (error) {
      console.log('Error opening in external player:', error);
      Alert.alert(
        'Player Error',
        'An unexpected error occurred while trying to open the video player.',
        [
          {
            text: 'OK',
            style: 'default'
          }
        ],
        { cancelable: true }
      );
    } finally {
      // Navigate back immediately after attempting to open
      navigation.goBack();
    }
  };

  // Return null since we don't want to render any UI
  return null;
};