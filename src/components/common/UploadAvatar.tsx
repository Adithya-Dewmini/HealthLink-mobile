import React, { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useImageUpload } from "../../hooks/useImageUpload";

type UploadAvatarProps = {
  imageUri?: string | null;
  initials: string;
  size?: number;
  onUploaded?: (imageUrl: string) => void;
};

const UploadAvatarComponent = ({
  imageUri,
  initials,
  size = 92,
  onUploaded,
}: UploadAvatarProps) => {
  const [showModal, setShowModal] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));
  const { loading, selectedImage, upload, pickImage, clearSelectedImage } = useImageUpload();

  const resolvedImageUri = selectedImage || imageUri || null;
  const avatarStyles = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
    }),
    [size]
  );

  const closeModal = () => {
    setShowModal(false);
    if (!loading) {
      clearSelectedImage();
    }
  };

  const handleChooseImage = async () => {
    await pickImage();
  };

  const handleUpload = async () => {
    const result = await upload("profile");
    if (result && "imageUrl" in result) {
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 0.7,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      onUploaded?.(result.imageUrl);
      setShowModal(false);
    }
  };

  return (
    <>
      <Pressable
        style={[styles.avatarButton, avatarStyles]}
        onPress={() => setShowModal(true)}
        android_ripple={{ color: "rgba(33, 150, 243, 0.12)", borderless: true }}
      >
        <Animated.View style={[styles.avatarShell, avatarStyles, { opacity: fade }]}>
          {resolvedImageUri ? (
            <Image source={{ uri: resolvedImageUri }} style={[styles.avatarImage, avatarStyles]} />
          ) : (
            <View style={[styles.avatarFallback, avatarStyles]}>
              <Text style={[styles.avatarInitials, { fontSize: Math.max(20, size * 0.28) }]}>
                {initials}
              </Text>
            </View>
          )}

          <View style={styles.cameraBadge}>
            <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
          </View>

          {loading ? (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator color="#FFFFFF" size="small" />
            </View>
          ) : null}
        </Animated.View>
      </Pressable>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Update photo</Text>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            ) : (
              <Text style={styles.modalSubtitle}>Choose a profile image from your gallery.</Text>
            )}
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleChooseImage}>
              <Text style={styles.modalPrimaryText}>
                {selectedImage ? "Choose Different Image" : "Choose from Gallery"}
              </Text>
            </TouchableOpacity>
            {selectedImage ? (
              <TouchableOpacity
                style={[styles.modalPrimaryButton, styles.uploadButton]}
                onPress={handleUpload}
                disabled={loading}
              >
                <Text style={styles.uploadButtonText}>
                  {loading ? "Uploading..." : "Upload Image"}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={closeModal}>
              <Text style={styles.modalSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export const UploadAvatar = memo(UploadAvatarComponent);

const styles = StyleSheet.create({
  avatarButton: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  avatarShell: {
    overflow: "hidden",
    backgroundColor: "#E3F2FD",
  },
  avatarImage: {
    resizeMode: "cover",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
  },
  avatarInitials: {
    color: "#2196F3",
    fontWeight: "800",
  },
  cameraBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 30, 46, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 30, 46, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1C1E",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6A6D7C",
    textAlign: "center",
    marginBottom: 16,
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 18,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalPrimaryButton: {
    borderRadius: 14,
    backgroundColor: "#EEF5FF",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  modalPrimaryText: {
    color: "#2196F3",
    fontSize: 15,
    fontWeight: "700",
  },
  uploadButton: {
    backgroundColor: "#2196F3",
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalSecondaryButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  modalSecondaryText: {
    color: "#6A6D7C",
    fontSize: 14,
    fontWeight: "600",
  },
});
