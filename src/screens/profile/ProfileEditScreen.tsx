import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiFetch } from "../../config/api";
import { useAuth } from "../../utils/AuthContext";
import { useImageUpload } from "../../hooks/useImageUpload";

const THEME = {
  primary: "#2196F3",
  background: "#F5F7FB",
  white: "#FFFFFF",
  textPrimary: "#1A1C1E",
  textSecondary: "#6A6D7C",
  border: "#E5EAF0",
  softBlue: "#E3F2FD",
  inputBackground: "#F8FAFC",
};

type PatientProfileResponse = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  phone?: string | null;
  profile_image?: string | null;
  specialization?: string | null;
  experience_years?: number | null;
  bio?: string | null;
  qualifications?: string | null;
  consultation_fee?: string | number | null;
};

const bustImageCache = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}t=${Date.now()}`;
};

export default function ProfileEditScreen() {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuth();
  const { loading: uploading, selectedImage, pickImage, upload } = useImageUpload();
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState({
    name: "",
    specialization: "",
    experience_years: "",
    bio: "",
    qualifications: "",
    consultation_fee: "",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const normalizedRole = String(user?.role || "").trim().toLowerCase();

  const roleLabel = useMemo(() => {
    const rawRole = String(user?.role || "patient").trim();
    if (!rawRole) {
      return "Patient";
    }

    return rawRole
      .split(/[_\s]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, [user?.role]);

  const initials = useMemo(() => {
    const sourceName = String(form.name || user?.name || "P").trim();
    return sourceName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [form.name, user?.name]);

  useEffect(() => {
    setEmail(String(user?.email || ""));
    setPhone(String(user?.phone || ""));
    setForm({
      name: String(user?.name || ""),
      specialization: String(user?.specialization || ""),
      experience_years:
        user?.experience_years === null || user?.experience_years === undefined
          ? ""
          : String(user.experience_years),
      bio: String(user?.bio || ""),
      qualifications: String(user?.qualifications || ""),
      consultation_fee:
        user?.consultation_fee === null || user?.consultation_fee === undefined
          ? ""
          : String(user.consultation_fee),
    });
    setProfileImage(user?.profile_image ?? null);
  }, [
    user?.bio,
    user?.consultation_fee,
    user?.email,
    user?.experience_years,
    user?.name,
    user?.phone,
    user?.profile_image,
    user?.qualifications,
    user?.specialization,
  ]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);

      try {
        const isDoctor = normalizedRole === "doctor";
        const endpoint = isDoctor ? "/api/doctor/me" : "/api/patients/me";
        console.log("ROLE:", normalizedRole);
        console.log("API CALL:", endpoint);
        const response = await apiFetch(endpoint);
        const data = (await response.json()) as PatientProfileResponse & { message?: string };

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You do not have permission to perform this action");
          }
          throw new Error(data?.message || "Failed to load profile");
        }

        setUser((prev) => ({
          ...(prev || {}),
          id: typeof data?.id === "number" ? data.id : prev?.id,
          name: String(data?.name || prev?.name || ""),
          email: String(data?.email || prev?.email || ""),
          role: String(data?.role || prev?.role || "patient"),
          phone: data?.phone ?? null,
          profile_image: data?.profile_image ?? prev?.profile_image ?? null,
          specialization: data?.specialization ?? prev?.specialization ?? null,
          experience_years: data?.experience_years ?? prev?.experience_years ?? null,
          bio: data?.bio ?? prev?.bio ?? null,
          qualifications: data?.qualifications ?? prev?.qualifications ?? null,
          consultation_fee: data?.consultation_fee ?? prev?.consultation_fee ?? null,
        }));
      } catch (error) {
        console.log("Profile edit load error:", error);
        Alert.alert("Profile", error instanceof Error ? error.message : "Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [normalizedRole, setUser]);

  const handleImageUpload = async () => {
    try {
      console.log("ROLE:", normalizedRole);
      const asset = await pickImage();
      if (!asset) {
        return;
      }

      const response = await upload("profile", asset);
      if (!response || !("imageUrl" in response)) {
        return;
      }

      const nextImageUrl = bustImageCache(response.imageUrl);
      setProfileImage(nextImageUrl);
      setUser((prev) => ({
        ...(prev || {}),
        profile_image: nextImageUrl,
      }));
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const handleSave = async () => {
    try {
      if (!form.name.trim()) {
        Alert.alert("Validation", "Name is required.");
        return;
      }

      if (normalizedRole === "doctor") {
        if (!form.specialization.trim()) {
          Alert.alert("Validation", "Specialization is required.");
          return;
        }

        if (form.experience_years.trim() && Number.isNaN(Number(form.experience_years))) {
          Alert.alert("Validation", "Experience must be a valid number.");
          return;
        }

        if (form.bio.trim().length > 500) {
          Alert.alert("Validation", "Bio cannot exceed 500 characters.");
          return;
        }
      }

      setSaving(true);

      const endpoint = normalizedRole === "doctor" ? "/api/doctor/me" : "/api/patients/me";
      console.log("ROLE:", normalizedRole);
      console.log("API CALL:", endpoint);
      const saveResponse = await apiFetch(endpoint, {
        method: "PUT",
        body: JSON.stringify(
          normalizedRole === "doctor"
            ? {
                name: form.name.trim() || undefined,
                phone: phone.trim() || undefined,
                specialization: form.specialization.trim() || undefined,
                experience_years: form.experience_years.trim() || undefined,
                bio: form.bio.trim() || undefined,
                qualifications: form.qualifications.trim() || undefined,
                consultation_fee: form.consultation_fee.trim() || undefined,
              }
            : {
                name: form.name.trim() || undefined,
                phone: phone.trim() || undefined,
              }
        ),
      });
      const data = (await saveResponse.json()) as PatientProfileResponse & { message?: string };

      if (!saveResponse.ok) {
        if (saveResponse.status === 403) {
          throw new Error("You do not have permission to perform this action");
        }
        throw new Error(data?.message || "Failed to save profile");
      }

      setUser((prev) => ({
        ...(prev || {}),
        id: typeof data?.id === "number" ? data.id : prev?.id,
        name: String(data?.name || form.name.trim() || prev?.name || ""),
        email: String(data?.email || email || prev?.email || ""),
        role: String(data?.role || prev?.role || "patient"),
        phone: data?.phone ?? (phone.trim() || null),
        profile_image: data?.profile_image ? bustImageCache(data.profile_image) : prev?.profile_image ?? null,
        specialization: data?.specialization ?? (form.specialization.trim() || null),
        experience_years:
          data?.experience_years ??
          (form.experience_years.trim() ? Number(form.experience_years) : null),
        bio: data?.bio ?? (form.bio.trim() || null),
        qualifications: data?.qualifications ?? (form.qualifications.trim() || null),
        consultation_fee:
          data?.consultation_fee ??
          (form.consultation_fee.trim() ? form.consultation_fee.trim() : null),
      }));

      navigation.goBack();
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.88}
          >
            <Ionicons name="chevron-back" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <TouchableOpacity style={styles.avatarButton} onPress={handleImageUpload} activeOpacity={0.88}>
            {selectedImage || profileImage ? (
              <Image source={{ uri: selectedImage || profileImage || "" }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials || "P"}</Text>
              </View>
            )}

            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>

            {uploading ? (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            ) : null}
          </TouchableOpacity>

          <Text style={styles.namePreview}>{form.name.trim() || user?.name || "Patient"}</Text>
          <Text style={styles.rolePreview}>
            {user?.role === "doctor" ? form.specialization.trim() || roleLabel : roleLabel}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Field label="Name">
            <TextInput
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="Enter your name"
              placeholderTextColor={THEME.textSecondary}
              style={styles.input}
            />
          </Field>

          <Field label="Email">
            <TextInput
              value={email}
              editable={false}
              placeholderTextColor={THEME.textSecondary}
              style={[styles.input, styles.inputDisabled]}
            />
          </Field>

          <Field label="Phone">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Add phone number"
              placeholderTextColor={THEME.textSecondary}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Field>

        </View>

        {user?.role === "doctor" ? (
          <>
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Professional Information</Text>

              <Field label="Specialization">
                <TextInput
                  value={form.specialization}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, specialization: value }))}
                  placeholder="Enter specialization"
                  placeholderTextColor={THEME.textSecondary}
                  style={styles.input}
                />
              </Field>

              <Field label="Experience (Years)">
                <TextInput
                  value={form.experience_years}
                  onChangeText={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      experience_years: value.replace(/[^0-9]/g, ""),
                    }))
                  }
                  placeholder="Enter years of experience"
                  placeholderTextColor={THEME.textSecondary}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </Field>

              <Field label="Qualifications">
                <TextInput
                  value={form.qualifications}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, qualifications: value }))}
                  placeholder="Enter qualifications"
                  placeholderTextColor={THEME.textSecondary}
                  style={styles.input}
                />
              </Field>

              <Field label="Consultation Fee (Optional)">
                <TextInput
                  value={form.consultation_fee}
                  onChangeText={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      consultation_fee: value.replace(/[^0-9.]/g, ""),
                    }))
                  }
                  placeholder="Enter consultation fee"
                  placeholderTextColor={THEME.textSecondary}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </Field>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>About / Bio</Text>
              <Field label="Professional Bio">
                <TextInput
                  value={form.bio}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
                  placeholder="Write a short doctor bio"
                  placeholderTextColor={THEME.textSecondary}
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </Field>
              <Text style={styles.metaText}>{form.bio.length}/500</Text>
            </View>
          </>
        ) : null}

        {(loadingProfile || saving) && !uploading ? (
          <ActivityIndicator color={THEME.primary} size="small" style={styles.inlineLoader} />
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, saving ? styles.saveButtonDisabled : null]}
          onPress={handleSave}
          disabled={saving || uploading || loadingProfile}
          activeOpacity={0.9}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving Changes..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  headerSpacer: {
    width: 42,
  },
  heroCard: {
    backgroundColor: THEME.white,
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  avatarButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    resizeMode: "cover",
    backgroundColor: THEME.softBlue,
  },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: THEME.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: "800",
    color: THEME.primary,
  },
  cameraIcon: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: THEME.white,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 55,
    backgroundColor: "rgba(15, 30, 46, 0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
  namePreview: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  rolePreview: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  formCard: {
    backgroundColor: THEME.white,
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
    marginBottom: 14,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: THEME.textPrimary,
    backgroundColor: THEME.inputBackground,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  inputDisabled: {
    color: "#8A93A3",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: "right",
  },
  inlineLoader: {
    marginTop: 18,
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
