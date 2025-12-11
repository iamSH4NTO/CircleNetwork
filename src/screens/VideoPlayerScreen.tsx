import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { VideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { PanGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(0.5);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  
  // Create video player instance
  const player = useVideoPlayer({ uri: videoUrl }, (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = volume;
    player.play();
    
    // Listen for events
    player.addListener('sourceLoad', () => {
      setIsLoading(false);
    });
    
    player.addListener('statusChange', (payload) => {
      if (payload.status === 'loading') {
        setIsLoading(true);
      } else if (payload.status === 'readyToPlay') {
        setIsLoading(false);
      } else if (payload.status === 'error') {
        console.error('Video player error:', payload.error);
        setIsLoading(false);
      }
    });
    
    player.addListener('playbackRateChange', () => {
      // Force re-render when playback rate changes
    });
  });

  // Animation values
  const controlsOpacity = useSharedValue(1);
  const volumeOpacity = useSharedValue(0);
  const brightnessOpacity = useSharedValue(0);
  const volumeValue = useSharedValue(1);
  const brightnessValue = useSharedValue(0.5);

  // Gesture handlers refs
  const panGestureRef = useRef(null);
  const tapGestureRef = useRef(null);

  // Animated styles
  const controlsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: controlsOpacity.value,
    };
  });

  const volumeAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: volumeOpacity.value,
    };
  });

  const brightnessAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: brightnessOpacity.value,
    };
  });

  // Toggle play/pause
  const handlePlayPause = async () => {
    if (player) {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  // Skip forward/backward
  const handleSkip = (seconds: number) => {
    if (player) {
      const newPosition = Math.max(0, Math.min(player.currentTime + seconds, player.duration));
      player.seekBy(newPosition - player.currentTime);
    }
  };

  // Rotate to specific orientation
  const rotateToOrientation = async (orientation: ScreenOrientation.OrientationLock) => {
    try {
      await ScreenOrientation.lockAsync(orientation);
      // Update fullscreen state based on orientation
      const isLandscape = orientation === ScreenOrientation.OrientationLock.LANDSCAPE_LEFT || 
                         orientation === ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT;
      setIsFullscreen(isLandscape);
    } catch (error) {
      console.log('Error rotating to orientation:', error);
    }
  };

  // Toggle auto-rotate
  const toggleAutoRotate = async () => {
    try {
      if (isAutoRotate) {
        // Disable auto-rotate, lock to current orientation
        const currentOrientation = await ScreenOrientation.getOrientationAsync();
        // Map Orientation to OrientationLock
        let lockOrientation: ScreenOrientation.OrientationLock;
        switch (currentOrientation) {
          case ScreenOrientation.Orientation.PORTRAIT_UP:
            lockOrientation = ScreenOrientation.OrientationLock.PORTRAIT_UP;
            break;
          case ScreenOrientation.Orientation.PORTRAIT_DOWN:
            lockOrientation = ScreenOrientation.OrientationLock.PORTRAIT_DOWN;
            break;
          case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
            lockOrientation = ScreenOrientation.OrientationLock.LANDSCAPE_LEFT;
            break;
          case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
            lockOrientation = ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT;
            break;
          default:
            lockOrientation = ScreenOrientation.OrientationLock.PORTRAIT_UP;
        }
        await ScreenOrientation.lockAsync(lockOrientation);
      } else {
        // Enable auto-rotate
        await ScreenOrientation.unlockAsync();
      }
      setIsAutoRotate(!isAutoRotate);
    } catch (error) {
      console.log('Error toggling auto-rotate:', error);
    }
  };

  // Handle orientation changes
  const handleOrientationChange = (orientationInfo: ScreenOrientation.OrientationInfo) => {
    if (isAutoRotate) {
      // Update fullscreen state based on new orientation
      const isLandscape = orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                         orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      setIsFullscreen(isLandscape);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        // Exit fullscreen
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsFullscreen(false);
        setIsAutoRotate(false); // Disable auto-rotate when exiting fullscreen
      } else {
        // Enter fullscreen
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
        setIsFullscreen(true);
      }
    } catch (error) {
      console.log('Error toggling fullscreen:', error);
    }
  };

  // Handle double tap to play/pause
  const onDoubleTap = async () => {
    handlePlayPause();
  };

  // Handle single tap to show/hide controls
  const onSingleTap = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      setShowControls(prev => !prev);
      controlsOpacity.value = withTiming(showControls ? 0 : 1, { duration: 300 });
    }
  };

  // Handle pan gestures for volume and brightness
  const onPanGestureEvent = (event: any) => {
    const { translationX, translationY, absoluteX } = event.nativeEvent;
    
    // Left side of screen - brightness control
    if (absoluteX < SCREEN_WIDTH / 2) {
      const newBrightness = Math.min(1, Math.max(0, brightnessValue.value - translationY / SCREEN_HEIGHT));
      brightnessValue.value = newBrightness;
      brightnessOpacity.value = withTiming(1, { duration: 150 });
      
      // Update brightness (would need device-specific implementation)
      runOnJS(setBrightness)(newBrightness);
    } 
    // Right side of screen - volume control
    else {
      const newVolume = Math.min(1, Math.max(0, volumeValue.value - translationY / SCREEN_HEIGHT));
      volumeValue.value = newVolume;
      volumeOpacity.value = withTiming(1, { duration: 150 });
      
      // Update volume
      if (player) {
        player.volume = newVolume;
        runOnJS(setVolume)(newVolume);
      }
    }
  };

  // Reset gesture indicators
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      volumeOpacity.value = withTiming(0, { duration: 1000 });
      brightnessOpacity.value = withTiming(0, { duration: 1000 });
    }
  };

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity || seconds === -Infinity) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Seek to position
  const seekTo = async (position: number) => {
    if (player) {
      player.seekBy(position - player.currentTime);
    }
  };

  // Handle progress bar press
  const onProgressBarPress = (event: any) => {
    if (player && player.duration > 0) {
      const position = event.nativeEvent.locationX;
      const progressBarWidth = SCREEN_WIDTH - 32; // Accounting for padding
      const percentage = Math.max(0, Math.min(1, position / progressBarWidth));
      const newPosition = percentage * player.duration;
      seekTo(newPosition);
    }
  };

  // Back button handler
  const handleBack = () => {
    if (isFullscreen) {
      toggleFullscreen();
    } else {
      navigation.goBack();
    }
  };

  // Hide header immediately when entering this screen
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    // Also hide the StatusBar
    StatusBar.setHidden(true);

    return () => {
      // Restore header when leaving screen
      navigation.setOptions({
        headerShown: true,
      });
      // Show StatusBar when leaving screen
      StatusBar.setHidden(false);
    };
  }, [navigation]);

  // Add orientation change listener
  useEffect(() => {
    const subscription = ScreenOrientation.addOrientationChangeListener(handleOrientationChange);
    
    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [isAutoRotate]);

  // Lock initial orientation
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    return () => {
      // Reset orientation when leaving screen
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar 
          hidden={isFullscreen || (player && player.playing)} 
          translucent={true}
          backgroundColor="transparent"
        />
        
        <PanGestureHandler
          ref={panGestureRef}
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onHandlerStateChange}>
          <TapGestureHandler
            ref={tapGestureRef}
            onHandlerStateChange={onSingleTap}
            numberOfTaps={1}>
            <TapGestureHandler
              onHandlerStateChange={({ nativeEvent }) => {
                if (nativeEvent.state === State.ACTIVE) {
                  runOnJS(onDoubleTap)();
                }
              }}
              numberOfTaps={2}>
              <Animated.View style={styles.videoContainer}>
                {player ? (
                  <VideoView
                    player={player}
                    style={styles.video}
                    contentFit="contain"
                    nativeControls={false}
                  />
                ) : (
                  <View style={[styles.video, { justifyContent: 'center', alignItems: 'center' }]}> 
                    <Text style={{ color: '#FFF' }}>Unable to load video player</Text>
                  </View>
                )}

                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                      Loading video...
                    </Text>
                  </View>
                )}

                {/* Volume indicator */}
                <Animated.View style={[styles.gestureIndicator, styles.volumeIndicator, volumeAnimatedStyle]}>
                  <MaterialIcons name="volume-up" size={24} color="#FFF" />
                  <Text style={styles.indicatorText}>{Math.round(volumeValue.value * 100)}%</Text>
                </Animated.View>

                {/* Brightness indicator */}
                <Animated.View style={[styles.gestureIndicator, styles.brightnessIndicator, brightnessAnimatedStyle]}>
                  <MaterialIcons name="brightness-6" size={24} color="#FFF" />
                  <Text style={styles.indicatorText}>{Math.round(brightnessValue.value * 100)}%</Text>
                </Animated.View>

                {/* Controls overlay */}
                <Animated.View style={[styles.controlsOverlay, controlsAnimatedStyle]}>
                  {/* Top bar */}
                  <View style={[styles.topBar, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                      <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    {title && (
                      <Text style={styles.title} numberOfLines={1}>
                        {title}
                      </Text>
                    )}
                    <TouchableOpacity onPress={toggleFullscreen} style={styles.fullscreenButton}>
                      <MaterialIcons 
                        name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
                        size={24} 
                        color="#FFF" 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Center controls */}
                  <View style={styles.centerControls}>
                    <View style={styles.centerControlsRow}>
                      <TouchableOpacity onPress={() => handleSkip(-10)} style={styles.skipButton}>
                        <MaterialIcons name="replay-10" size={32} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
                        <MaterialIcons 
                          name={player?.playing ? "pause" : "play-arrow"} 
                          size={48} 
                          color="#FFF" 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleSkip(10)} style={styles.skipButton}>
                        <MaterialIcons name="forward-10" size={32} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Bottom controls */}
                  <View style={[styles.bottomControls, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    {/* Progress bar */}
                    <TouchableOpacity 
                      style={styles.progressBarContainer} 
                      onPress={onProgressBarPress}
                      activeOpacity={1}
                    >
                      <View style={styles.progressBarBackground}>
                        {player && player.duration > 0 && (
                          <View 
                            style={[
                              styles.progressBarFill, 
                              { 
                                width: `${(player.currentTime / player.duration) * 100}%`,
                                backgroundColor: theme.colors.primary 
                              }
                            ]} 
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                    
                    {/* Time and controls */}
                    <View style={styles.timeControls}>
                      <Text style={styles.timeText}>
                        {player ? formatTime(player.currentTime) : '0:00'}
                      </Text>
                      
                      <View style={styles.controlButtons}>
                        <TouchableOpacity onPress={() => handleSkip(-10)}>
                          <MaterialIcons name="replay-10" size={20} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handlePlayPause} style={styles.marginHorizontal}>
                          <MaterialIcons 
                            name={player?.playing ? "pause" : "play-arrow"} 
                            size={24} 
                            color="#FFF" 
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleSkip(10)} style={styles.marginHorizontal}>
                          <MaterialIcons name="forward-10" size={20} color="#FFF" />
                        </TouchableOpacity>
                        
                        {/* Rotate Buttons - Only visible in fullscreen */}
                        {isFullscreen && (
                          <>
                            <TouchableOpacity onPress={() => rotateToOrientation(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT)} style={styles.marginLeft}>
                              <MaterialIcons name="screen-rotation" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={toggleAutoRotate} style={styles.marginLeft}>
                              <MaterialIcons 
                                name={isAutoRotate ? "auto-awesome" : "auto-awesome-motion"} 
                                size={24} 
                                color={isAutoRotate ? "#00AAEA" : "#FFF"} 
                              />
                            </TouchableOpacity>
                          </>
                        )}
                        
                        <TouchableOpacity onPress={toggleFullscreen} style={styles.marginLeft}>
                          <MaterialIcons 
                            name={isFullscreen ? "fullscreen-exit" : "fullscreen"} 
                            size={24} 
                            color="#FFF" 
                          />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.timeText}>
                        {player ? formatTime(player.duration) : '0:00'}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </Animated.View>
            </TapGestureHandler>
          </TapGestureHandler>
        </PanGestureHandler>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
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
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  fullscreenButton: {
    padding: 8,
  },
  centerControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    padding: 10,
  },
  skipButton: {
    padding: 10,
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBarContainer: {
    height: 30,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  timeControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#FFF',
    fontSize: 12,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marginLeft: {
    marginLeft: 16,
  },
  marginHorizontal: {
    marginHorizontal: 8,
  },
  gestureIndicator: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 8,
  },
  volumeIndicator: {
    top: '50%',
    right: 32,
  },
  brightnessIndicator: {
    top: '50%',
    left: 32,
  },
  indicatorText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 16,
  },
});