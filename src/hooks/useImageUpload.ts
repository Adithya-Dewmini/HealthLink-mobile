import { useCallback, useState } from "react";
import { Alert } from "react-native";
import {
  pickSingleImage,
  uploadClinicImages,
  uploadPharmacyImages,
  uploadProfileImage,
  type UploadableAsset,
} from "../services/mediaUploadService";
import { resolveImageUrl } from "../utils/imageUrl";

type UploadType = "profile" | "clinic" | "pharmacy";

type UploadClinicInput = {
  clinicId: string;
  logo?: UploadableAsset | null;
  cover?: UploadableAsset | null;
};

type UploadPharmacyInput = {
  pharmacyId: string;
  logo?: UploadableAsset | null;
  cover?: UploadableAsset | null;
};

type UploadResult =
  | { imageUrl: string; imageId: string }
  | { logoUrl: string | null; logoId: string | null; coverUrl: string | null; coverId: string | null };

const getErrorMessage = (error: unknown) => {
  const responseStatus =
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as any).response?.status === "number"
      ? Number((error as any).response.status)
      : null;

  if (responseStatus === 403) {
    return "You do not have permission to perform this action";
  }

  const responseMessage =
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as any).response?.data?.message === "string"
      ? String((error as any).response.data.message)
      : "";

  if (responseMessage) {
    return responseMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Upload failed. Please try again.";
};

export const useImageUpload = () => {
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<UploadableAsset | null>(null);

  const pickImage = useCallback(async () => {
    try {
      const asset = await pickSingleImage();
      if (!asset) {
        return null;
      }

      setSelectedImage(asset.uri);
      setSelectedAsset(asset);
      return asset;
    } catch (error) {
      Alert.alert("Image Upload", getErrorMessage(error));
      return null;
    }
  }, []);

  const clearSelectedImage = useCallback(() => {
    setSelectedImage(null);
    setSelectedAsset(null);
  }, []);

  const upload = useCallback(
    async (
      type: UploadType,
      input?: UploadableAsset | UploadClinicInput | UploadPharmacyInput
    ): Promise<UploadResult | null> => {
      try {
        setLoading(true);

        if (type === "profile") {
          console.log("API CALL:", "/api/upload/profile");
          const asset =
            (input as UploadableAsset | undefined) ??
            selectedAsset ??
            (await pickImage());
          if (!asset) {
            return null;
          }

          const response = await uploadProfileImage(asset);
          setSelectedImage(resolveImageUrl(response.data.imageUrl));
          setSelectedAsset(null);
          return {
            ...response.data,
            imageUrl: resolveImageUrl(response.data.imageUrl) ?? response.data.imageUrl,
          };
        }

        if (type === "clinic") {
          const response = await uploadClinicImages(input as UploadClinicInput);
          return response.data;
        }

        const response = await uploadPharmacyImages(input as UploadPharmacyInput);
        return response.data;
      } catch (error) {
        Alert.alert("Image Upload", getErrorMessage(error));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [pickImage, selectedAsset]
  );

  return {
    upload,
    pickImage,
    clearSelectedImage,
    loading,
    selectedImage,
  };
};
