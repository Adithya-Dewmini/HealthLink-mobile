import * as ImagePicker from "expo-image-picker";
import { api } from "../api/client";

type UploadableAsset = {
  uri: string;
  name: string;
  type: string;
};

type UploadResponse<T> = {
  success: true;
  data: T;
};

const ensureGalleryPermission = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.granted) {
    return;
  }

  if (permission.canAskAgain) {
    throw new Error("Gallery permission is required to upload images");
  }

  throw new Error("Photo access is blocked. Enable it in device settings to upload an image");
};

export const pickSingleImage = async () => {
  await ensureGalleryPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `upload-${Date.now()}.jpg`,
    type: asset.mimeType || "image/jpeg",
  } satisfies UploadableAsset;
};

const appendAsset = (formData: FormData, field: string, asset: UploadableAsset) => {
  formData.append(field, {
    uri: asset.uri,
    name: asset.name,
    type: asset.type,
  } as any);
};

export const uploadProfileImage = async (asset: UploadableAsset) => {
  const formData = new FormData();
  appendAsset(formData, "image", asset);
  console.log("API CALL:", "/api/upload/profile");

  const response = await api.post("/api/upload/profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data as UploadResponse<{ imageUrl: string; imageId: string }>;
};

export const uploadClinicImages = async (input: {
  clinicId: string;
  logo?: UploadableAsset | null;
  cover?: UploadableAsset | null;
}) => {
  const formData = new FormData();
  formData.append("clinicId", input.clinicId);

  if (input.logo) appendAsset(formData, "logo", input.logo);
  if (input.cover) appendAsset(formData, "cover", input.cover);

  const response = await api.post("/api/upload/clinic", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data as UploadResponse<{
    logoUrl: string | null;
    logoId: string | null;
    coverUrl: string | null;
    coverId: string | null;
  }>;
};

export const uploadClinicLogo = async (clinicId: string, asset?: UploadableAsset | null) => {
  const resolvedAsset = asset ?? (await pickSingleImage());
  if (!resolvedAsset) {
    return null;
  }

  return uploadClinicImages({
    clinicId,
    logo: resolvedAsset,
  });
};

export const uploadClinicCover = async (clinicId: string, asset?: UploadableAsset | null) => {
  const resolvedAsset = asset ?? (await pickSingleImage());
  if (!resolvedAsset) {
    return null;
  }

  return uploadClinicImages({
    clinicId,
    cover: resolvedAsset,
  });
};

export const uploadPharmacyImages = async (input: {
  pharmacyId: string;
  logo?: UploadableAsset | null;
  cover?: UploadableAsset | null;
}) => {
  const formData = new FormData();
  formData.append("pharmacyId", input.pharmacyId);

  if (input.logo) appendAsset(formData, "logo", input.logo);
  if (input.cover) appendAsset(formData, "cover", input.cover);

  const response = await api.post("/api/upload/pharmacy", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data as UploadResponse<{
    logoUrl: string | null;
    logoId: string | null;
    coverUrl: string | null;
    coverId: string | null;
  }>;
};

export const uploadPharmacyLogo = async (pharmacyId: string, asset?: UploadableAsset | null) => {
  const resolvedAsset = asset ?? (await pickSingleImage());
  if (!resolvedAsset) {
    return null;
  }

  return uploadPharmacyImages({
    pharmacyId,
    logo: resolvedAsset,
  });
};

export const uploadPharmacyCover = async (pharmacyId: string, asset?: UploadableAsset | null) => {
  const resolvedAsset = asset ?? (await pickSingleImage());
  if (!resolvedAsset) {
    return null;
  }

  return uploadPharmacyImages({
    pharmacyId,
    cover: resolvedAsset,
  });
};

export type { UploadableAsset, UploadResponse };
