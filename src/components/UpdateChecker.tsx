import React, { useEffect, useState } from 'react';
import { Alert, View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { checkGitHubReleases, applyUpdate } from '../utils/UpdateUtils';

interface UpdateCheckerProps {
  onCheckComplete: () => void;
}

export const UpdateChecker: React.FC<UpdateCheckerProps> = ({ onCheckComplete }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const { updateAvailable: isAvailable, releaseInfo } = await checkGitHubReleases();
      
      if (isAvailable && releaseInfo) {
        setDownloadUrl(releaseInfo.browser_download_url);
        setUpdateAvailable(true);
      } else {
        // No update available, continue with app
        onCheckComplete();
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
      setUpdateError(true);
      // Still allow the user to proceed after a short delay
      setTimeout(() => {
        onCheckComplete();
      }, 3000);
    }
  };

  const handleUpdate = () => {
    applyUpdate(downloadUrl);
  };

  if (updateError) {
    return (
      <Modal visible={true} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Network Error</Text>
            <Text style={styles.message}>
              Unable to check for updates. Continuing to app...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (updateAvailable) {
    return (
      <Modal visible={true} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Update Required</Text>
            <Text style={styles.message}>
              A new version of CircleNetwork is available. You must update to continue using the app.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleUpdate}>
              <Text style={styles.buttonText}>Update Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    maxWidth: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});