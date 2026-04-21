import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { apiFetch } from "../../config/api";
import Toast from "react-native-toast-message";

const THEME = {
  primary: "#2BB673",
  primaryDark: "#20925A",
  background: "#F7F9FB",
  white: "#FFFFFF",
  textPrimary: "#122033",
  textMuted: "#6B7280",
  border: "#D7E1EA",
  borderDashed: "#B7C4D3",
  shadow: "#0F172A",
};

const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "dpb2t1wlr";
const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "healthlink_upload";

type LookupOption = {
  id: number;
  name: string;
};

type LookupType = "category" | "brand";

const loadImagePicker = async () => import("expo-image-picker");

export default function AddMedicineScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<LookupOption[]>([]);
  const [brands, setBrands] = useState<LookupOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [pendingExpiryDate, setPendingExpiryDate] = useState<Date>(new Date());
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [activeSelector, setActiveSelector] = useState<LookupType>("category");
  const [createLookupVisible, setCreateLookupVisible] = useState(false);
  const [createLookupType, setCreateLookupType] = useState<LookupType>("category");
  const [newLookupName, setNewLookupName] = useState("");
  const [creatingLookup, setCreatingLookup] = useState(false);
  const editingMedicine = route.params?.medicine || null;
  const isEditMode = Boolean(editingMedicine?.id);

  const clearFeedback = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const resetForm = () => {
    setName("");
    setSelectedCategoryId(null);
    setSelectedBrandId(null);
    setDescription("");
    setQuantity("");
    setPrice("");
    setExpiryDate(null);
    setShowDateModal(false);
    setPendingExpiryDate(new Date());
    setImage(null);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const loadLookupOptions = async () => {
    try {
      setLookupLoading(true);

      const [categoriesResponse, brandsResponse] = await Promise.all([
        apiFetch("/api/pharmacy/categories"),
        apiFetch("/api/pharmacy/brands"),
      ]);

      const categoriesData = await categoriesResponse.json();
      const brandsData = await brandsResponse.json();

      if (!categoriesResponse.ok) {
        throw new Error(categoriesData?.message || "Failed to load categories");
      }

      if (!brandsResponse.ok) {
        throw new Error(brandsData?.message || "Failed to load brands");
      }

      setCategories(Array.isArray(categoriesData?.categories) ? categoriesData.categories : []);
      setBrands(Array.isArray(brandsData?.brands) ? brandsData.brands : []);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to load categories and brands.");
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    loadLookupOptions();
  }, []);

  useEffect(() => {
    if (!editingMedicine) {
      resetForm();
      return;
    }

    setName(editingMedicine.name || "");
    setSelectedCategoryId(editingMedicine.category_id ?? null);
    setSelectedBrandId(editingMedicine.brand_id ?? null);
    setDescription(editingMedicine.description || "");
    setQuantity(
      editingMedicine.quantity === null || editingMedicine.quantity === undefined
        ? ""
        : String(editingMedicine.quantity)
    );
    setPrice(
      editingMedicine.price === null || editingMedicine.price === undefined
        ? ""
        : String(editingMedicine.price)
    );
    setExpiryDate(editingMedicine.expiry_date ? new Date(editingMedicine.expiry_date) : null);
    setImage(editingMedicine.image_url || null);
    setStatusMessage(null);
    setErrorMessage(null);
  }, [editingMedicine]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const selectedBrand = useMemo(
    () => brands.find((item) => item.id === selectedBrandId) || null,
    [brands, selectedBrandId]
  );

  const formatDate = (value: Date | null) => {
    if (!value) return "Select expiry date";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(value);
  };

  const openDatePicker = () => {
    Keyboard.dismiss();
    clearFeedback();
    setPendingExpiryDate(expiryDate || new Date());
    setShowDateModal(true);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setPendingExpiryDate(selectedDate);
    }
  };

  const closeDateModal = () => {
    setShowDateModal(false);
  };

  const confirmDateSelection = () => {
    setExpiryDate(pendingExpiryDate);
    setShowDateModal(false);
  };

  const openSelector = (type: LookupType) => {
    Keyboard.dismiss();
    clearFeedback();
    setActiveSelector(type);
    setSelectorVisible(true);
  };

  const closeSelector = () => {
    setSelectorVisible(false);
  };

  const openCreateLookupModal = (type: LookupType) => {
    setCreateLookupType(type);
    setNewLookupName("");
    setCreateLookupVisible(true);
  };

  const closeCreateLookupModal = () => {
    if (creatingLookup) return;
    setCreateLookupVisible(false);
    setNewLookupName("");
  };

  const handleSelectLookup = (option: LookupOption) => {
    if (activeSelector === "category") {
      setSelectedCategoryId(option.id);
    } else {
      setSelectedBrandId(option.id);
    }
    setSelectorVisible(false);
    clearFeedback();
  };

  const handleCreateLookup = async () => {
    const trimmedName = newLookupName.trim();
    if (!trimmedName) {
      Alert.alert("Validation", `${createLookupType === "category" ? "Category" : "Brand"} name is required.`);
      return;
    }

    try {
      setCreatingLookup(true);
      const endpoint =
        createLookupType === "category" ? "/api/pharmacy/categories" : "/api/pharmacy/brands";
      const response = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || `Failed to create ${createLookupType === "category" ? "category" : "brand"}`
        );
      }

      const createdOption =
        createLookupType === "category" ? data?.category : data?.brand;

      if (!createdOption?.id) {
        throw new Error("Created item response was invalid");
      }

      if (createLookupType === "category") {
        setCategories((current) =>
          [...current, createdOption].sort((a, b) => a.name.localeCompare(b.name))
        );
        setSelectedCategoryId(createdOption.id);
      } else {
        setBrands((current) =>
          [...current, createdOption].sort((a, b) => a.name.localeCompare(b.name))
        );
        setSelectedBrandId(createdOption.id);
      }

      setCreateLookupVisible(false);
      setNewLookupName("");
      Toast.show({
        type: "success",
        text1: `${createLookupType === "category" ? "Category" : "Brand"} created`,
      });
    } catch (error: any) {
      Alert.alert("Create failed", error?.message || "Unable to create item.");
    } finally {
      setCreatingLookup(false);
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "image/jpeg",
      name: "upload.jpg",
    } as any);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const payload = await response.json();

    if (!response.ok || !payload?.secure_url) {
      throw new Error(payload?.error?.message || "Cloudinary upload failed");
    }

    return payload.secure_url as string;
  };

  const pickImage = async () => {
    if (uploading) return;

    try {
      clearFeedback();
      const ImagePicker = await loadImagePicker();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        const message = permission.canAskAgain
          ? "Allow gallery access to upload a medicine image."
          : "Photo access is blocked. Enable it in device settings to upload an image.";
        setErrorMessage(message);
        Alert.alert("Permission needed", message);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setUploading(true);
      const uploadedUrl = await uploadToCloudinary(result.assets[0].uri);
      setImage(uploadedUrl);
      setStatusMessage("Medicine image uploaded successfully.");
    } catch (error: any) {
      const message = error?.message || "Unable to upload the image right now.";
      setErrorMessage(message);
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (saving || uploading) return;

    const trimmedName = name.trim();
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);

    if (!trimmedName) {
      setErrorMessage("Medicine name is required.");
      Alert.alert("Validation", "Medicine name is required.");
      return;
    }

    if (!selectedCategoryId) {
      setErrorMessage("Category is required.");
      Alert.alert("Validation", "Select a category.");
      return;
    }

    if (!selectedBrandId) {
      setErrorMessage("Brand is required.");
      Alert.alert("Validation", "Select a brand.");
      return;
    }

    if (!quantity.trim() || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage("Quantity is required.");
      Alert.alert("Validation", "Quantity is required.");
      return;
    }

    if (!expiryDate) {
      setErrorMessage("Expiry date is required.");
      Alert.alert("Validation", "Expiry date is required.");
      return;
    }

    if (!price.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setErrorMessage("Price is required.");
      Alert.alert("Validation", "Price is required and must be greater than 0.");
      return;
    }

    try {
      clearFeedback();
      Keyboard.dismiss();
      setSaving(true);

      const payload = {
        name: trimmedName,
        category_id: selectedCategoryId,
        brand_id: selectedBrandId,
        description: description.trim(),
        image_url: image,
        quantity: parsedQuantity,
        expiry_date: expiryDate.toISOString().split("T")[0],
        price: Number(parsedPrice.toFixed(2)),
      };

      console.log(`${isEditMode ? "Update" : "Save"} medicine payload:`, payload);
      const response = await apiFetch(
        isEditMode ? `/api/pharmacy/medicines/${editingMedicine.id}` : "/api/pharmacy/medicine",
        {
          method: isEditMode ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      console.log(`${isEditMode ? "Update" : "Save"} medicine response:`, data);

      if (!response.ok) {
        throw new Error(data?.message || `Unable to ${isEditMode ? "update" : "save"} medicine.`);
      }

      const message = isEditMode ? "Medicine updated" : "Medicine saved";
      setStatusMessage(message);
      Toast.show({ type: "success", text1: message });

      if (isEditMode) {
        navigation.goBack();
      } else {
        resetForm();
      }
    } catch (error: any) {
      const message = error?.message || "Unable to prepare medicine details.";
      setErrorMessage(message);
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const isBusy = uploading || saving;
  const headerTitle = useMemo(() => (isEditMode ? "Edit Medicine" : "Add Medicine"), [isEditMode]);
  const headerSubtitle = useMemo(
    () => (isEditMode ? "Update medicine details" : "Upload an image and enter medicine details"),
    [isEditMode]
  );
  const canSave =
    !isBusy &&
    Boolean(name.trim()) &&
    Boolean(selectedCategoryId) &&
    Boolean(selectedBrandId) &&
    Boolean(quantity.trim()) &&
    Number(quantity) > 0 &&
    Boolean(price.trim()) &&
    Number(price) > 0 &&
    Boolean(expiryDate);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{headerSubtitle}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introBlock}>
            <Text style={styles.introTitle}>Medicine Details</Text>
            <Text style={styles.introText}>
              Upload the product image first, then complete the medicine information below.
            </Text>
            {lookupLoading ? (
              <View style={styles.lookupLoadingRow}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={styles.lookupLoadingText}>Loading categories and brands...</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.uploadCard}
            onPress={pickImage}
            disabled={uploading}
            activeOpacity={0.88}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.iconBadge}>
                  <Ionicons name="cloud-upload-outline" size={28} color={THEME.primary} />
                </View>
                <Text style={styles.uploadTitle}>Upload Medicine Image</Text>
                <Text style={styles.uploadSubtitle}>Choose from gallery</Text>
              </View>
            )}

            {uploading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={THEME.white} />
                <Text style={styles.loadingText}>Uploading image...</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <Field
              label="Medicine Name *"
              placeholder="e.g. Amoxicillin"
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (errorMessage || statusMessage) clearFeedback();
              }}
              autoCapitalize="words"
            />
            <View style={styles.lookupRow}>
              <TouchableOpacity
                style={styles.lookupField}
                onPress={() => openSelector("category")}
                activeOpacity={0.85}
              >
                <Text style={styles.fieldLabel}>Category *</Text>
                <View style={styles.lookupInput}>
                  <Text style={[styles.lookupValue, !selectedCategory && styles.datePlaceholder]}>
                    {selectedCategory?.name || "Select category"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={THEME.textMuted} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addLookupButton}
                onPress={() => openCreateLookupModal("category")}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={THEME.primary} />
                <Text style={styles.addLookupText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.lookupRow}>
              <TouchableOpacity
                style={styles.lookupField}
                onPress={() => openSelector("brand")}
                activeOpacity={0.85}
              >
                <Text style={styles.fieldLabel}>Brand *</Text>
                <View style={styles.lookupInput}>
                  <Text style={[styles.lookupValue, !selectedBrand && styles.datePlaceholder]}>
                    {selectedBrand?.name || "Select brand"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={THEME.textMuted} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addLookupButton}
                onPress={() => openCreateLookupModal("brand")}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={THEME.primary} />
                <Text style={styles.addLookupText}>Add</Text>
              </TouchableOpacity>
            </View>
            <Field
              label="Quantity *"
              placeholder="e.g. 100"
              value={quantity}
              onChangeText={(value) => {
                setQuantity(value.replace(/[^0-9]/g, ""));
                if (errorMessage || statusMessage) clearFeedback();
              }}
              keyboardType="number-pad"
            />
            <Field
              label="Price *"
              placeholder="e.g. 150.00"
              value={price}
              onChangeText={(value) => {
                const sanitized = value
                  .replace(/[^0-9.]/g, "")
                  .replace(/(\..*)\./g, "$1");
                setPrice(sanitized);
                if (errorMessage || statusMessage) clearFeedback();
              }}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.dateField}
              onPress={openDatePicker}
              activeOpacity={0.85}
            >
              <Text style={styles.fieldLabel}>Expiry Date *</Text>
              <View style={styles.dateInput}>
                <Text
                  style={[
                    styles.dateValue,
                    !expiryDate && styles.datePlaceholder,
                  ]}
                >
                  {formatDate(expiryDate)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={THEME.textMuted} />
              </View>
            </TouchableOpacity>
            <Field
              label="Description"
              placeholder="Short description..."
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                if (errorMessage || statusMessage) clearFeedback();
              }}
              multiline
              height={120}
            />
          </View>

          {statusMessage ? (
            <View style={styles.uploadedRow}>
              <Ionicons name="checkmark-circle" size={18} color={THEME.primary} />
              <Text style={styles.uploadedText}>{statusMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.disabledButton]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.92}
        >
          {saving ? (
            <>
              <ActivityIndicator color={THEME.white} />
              <Text style={styles.saveButtonText}>Preparing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.saveButtonText}>{isEditMode ? "Update Medicine" : "Save Medicine"}</Text>
              <Ionicons name="checkmark-circle" size={20} color={THEME.white} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={selectorVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSelector}
      >
        <Pressable style={styles.modalOverlay} onPress={closeSelector}>
          <Pressable style={styles.selectorSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Select {activeSelector === "category" ? "Category" : "Brand"}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.selectorList}>
              {(activeSelector === "category" ? categories : brands).map((option) => {
                const selectedId =
                  activeSelector === "category" ? selectedCategoryId : selectedBrandId;

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.selectorItem}
                    onPress={() => handleSelectLookup(option)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.selectorItemText}>{option.name}</Text>
                    {selectedId === option.id ? (
                      <Ionicons name="checkmark-circle" size={18} color={THEME.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={createLookupVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCreateLookupModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeCreateLookupModal}>
          <Pressable style={styles.createLookupCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>
              Add {createLookupType === "category" ? "Category" : "Brand"}
            </Text>
            <TextInput
              value={newLookupName}
              onChangeText={setNewLookupName}
              placeholder={`Enter ${createLookupType} name`}
              placeholderTextColor="#94A3B8"
              style={styles.modalTextInput}
              editable={!creatingLookup}
            />
            <View style={styles.createLookupActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={closeCreateLookupModal}
                disabled={creatingLookup}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleCreateLookup}
                disabled={creatingLookup}
              >
                {creatingLookup ? (
                  <ActivityIndicator color={THEME.white} />
                ) : (
                  <Text style={styles.modalPrimaryText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showDateModal}
        transparent
        animationType="slide"
        onRequestClose={closeDateModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDateModal}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeDateModal} style={styles.modalActionButton}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Expiry Date</Text>
              <TouchableOpacity onPress={confirmDateSelection} style={styles.modalActionButton}>
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalPickerWrap}>
              <DateTimePicker
                value={pendingExpiryDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  height?: number;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
};

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = "sentences",
  multiline = false,
  height = 56,
  keyboardType = "default",
}: FieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          styles.input,
          {
            height,
            textAlignVertical: multiline ? "top" : "center",
            paddingTop: multiline ? 14 : 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: "#EAF0F5",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 14,
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: THEME.textMuted,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  introBlock: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  introText: {
    marginTop: 6,
    color: THEME.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  lookupLoadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lookupLoadingText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  uploadCard: {
    height: 224,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: THEME.borderDashed,
    backgroundColor: THEME.white,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: THEME.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F8EF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  uploadSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: THEME.textMuted,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 32, 51, 0.48)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 18,
    shadowColor: THEME.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 15,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  lookupRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 16,
  },
  lookupField: {
    flex: 1,
  },
  lookupInput: {
    height: 56,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FBFDFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lookupValue: {
    fontSize: 15,
    color: THEME.textPrimary,
  },
  addLookupButton: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#E8F8EF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 1,
  },
  addLookupText: {
    color: THEME.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    color: THEME.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FBFDFF",
    color: THEME.textPrimary,
    fontSize: 15,
  },
  dateField: {
    marginBottom: 16,
  },
  dateInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FBFDFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateValue: {
    fontSize: 15,
    color: THEME.textPrimary,
  },
  datePlaceholder: {
    color: THEME.textMuted,
  },
  uploadedRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  uploadedText: {
    color: THEME.primaryDark,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  bottomSpacer: {
    height: 100,
  },
  footer: {
    backgroundColor: THEME.white,
    borderTopWidth: 1,
    borderTopColor: "#EAF0F5",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: THEME.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: THEME.white,
    fontSize: 16,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    minHeight: "40%",
    shadowColor: THEME.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D9E0",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalActionButton: {
    minWidth: 64,
    paddingVertical: 8,
  },
  modalTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: THEME.textPrimary,
  },
  modalCancelText: {
    fontSize: 16,
    color: THEME.textMuted,
    fontWeight: "600",
  },
  modalDoneText: {
    textAlign: "right",
    fontSize: 16,
    color: THEME.primary,
    fontWeight: "800",
  },
  modalPickerWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
  },
  selectorSheet: {
    backgroundColor: THEME.white,
    borderRadius: 22,
    marginHorizontal: 20,
    padding: 18,
    maxHeight: "60%",
  },
  selectorList: {
    marginTop: 12,
  },
  selectorItem: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FBFDFF",
    marginBottom: 10,
  },
  selectorItemText: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  createLookupCard: {
    backgroundColor: THEME.white,
    borderRadius: 22,
    marginHorizontal: 20,
    padding: 20,
  },
  modalTextInput: {
    height: 52,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    color: THEME.textPrimary,
    fontSize: 15,
    marginTop: 14,
  },
  createLookupActions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalSecondaryButton: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  modalSecondaryText: {
    color: THEME.textMuted,
    fontWeight: "700",
  },
  modalPrimaryButton: {
    minWidth: 96,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
  },
  modalPrimaryText: {
    color: THEME.white,
    fontWeight: "800",
  },
});
