import { resolveImageUrl } from "./imageUrl";

const DEFAULT_IMAGE_FIELDS = [
  "cover_image_url",
  "coverImageUrl",
  "cover_image",
  "coverImage",
  "image_url",
  "imageUrl",
  "logo_url",
  "logoUrl",
  "profile_image_url",
  "profileImageUrl",
  "profile_image",
  "profileImage",
  "avatarUrl",
  "avatar",
  "secure_url",
  "cloudinary_url",
  "cloudinaryUrl",
] as const;

const readField = (source: Record<string, unknown>, field: string) => {
  const value = source[field];
  return typeof value === "string" ? value : null;
};

const normalizeCandidate = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = resolveImageUrl(value);
  return normalized && /^https?:\/\//i.test(normalized) ? normalized : null;
};

export const resolveDoctorImage = (
  ...candidates: Array<string | null | undefined | Record<string, unknown>>
) => {
  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      const normalized = normalizeCandidate(candidate);
      if (normalized) return normalized;
      continue;
    }

    for (const field of DEFAULT_IMAGE_FIELDS) {
      const normalized = normalizeCandidate(readField(candidate, field));
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
};

export const getDisplayInitials = (value?: string | null, fallback = "DR") => {
  const text = String(value || "").trim();
  if (!text) return fallback;

  const initials = text
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || fallback;
};
