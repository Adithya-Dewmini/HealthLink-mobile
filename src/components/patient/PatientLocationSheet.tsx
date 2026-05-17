import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { patientTheme } from "../../constants/patientTheme";
import LocationSearchInput from "./LocationSearchInput";
import SavedLocationRow from "./SavedLocationRow";
import { getCurrentLocationSelection, getPlaceDetails, searchPlaces } from "../../services/locationApi";
import type { LocationSearchSuggestion, PatientLocation, PatientLocationDraft } from "../../types/location";

type Props = {
  visible: boolean;
  selectedLocation?: PatientLocation | null;
  savedLocations: PatientLocation[];
  onClose: () => void;
  onSelect: (location: PatientLocation) => void;
  onSave: (location: PatientLocationDraft) => void;
  onDelete: (id: string) => void;
};

type DraftForm = {
  id?: string | null;
  label: string;
  formattedAddress: string;
  line1: string;
  line2: string;
  city: string;
  district: string;
  phone: string;
  deliveryNotes: string;
  latitude: number | null;
  longitude: number | null;
  placeId?: string | null;
  source: PatientLocation["source"];
  isDefault: boolean;
};

const THEME = patientTheme.colors;

const buildFormFromLocation = (location: PatientLocation | null): DraftForm => ({
  id: location?.id ?? null,
  label: location?.label || "",
  formattedAddress: location?.formattedAddress || "",
  line1: location?.line1 || location?.formattedAddress || "",
  line2: location?.line2 || "",
  city: location?.city || "",
  district: location?.district || "",
  phone: location?.phone || "",
  deliveryNotes: location?.deliveryNotes || "",
  latitude: location?.latitude ?? null,
  longitude: location?.longitude ?? null,
  placeId: location?.placeId || null,
  source: location?.source || "manual",
  isDefault: Boolean(location?.isDefault),
});

export default function PatientLocationSheet({
  visible,
  selectedLocation,
  savedLocations,
  onClose,
  onSelect,
  onSave,
  onDelete,
}: Props) {
  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSearchSuggestion[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorTitle, setEditorTitle] = useState("Save location");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftForm>(buildFormFromLocation(null));

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setSearchError(null);
      setSuggestions([]);
      setEditorVisible(false);
      setEditorError(null);
      setDraft(buildFormFromLocation(null));
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (!query.trim()) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          setSearchLoading(true);
          setSearchError(null);
          const nextSuggestions = await searchPlaces(query);
          setSuggestions(nextSuggestions);
          if (nextSuggestions.length === 0) {
            setSearchError("No addresses found.");
          }
        } catch (error) {
          setSuggestions([]);
          setSearchError(error instanceof Error ? error.message : "Could not search addresses right now. Please try again.");
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 320);

    return () => clearTimeout(timeout);
  }, [query, visible]);

  const homeLocation = useMemo(
    () => savedLocations.find((location) => String(location.label || "").trim().toLowerCase() === "home") ?? null,
    [savedLocations]
  );
  const workLocation = useMemo(
    () => savedLocations.find((location) => String(location.label || "").trim().toLowerCase() === "work") ?? null,
    [savedLocations]
  );

  const openEditor = (location: PatientLocation | null, title = "Save location") => {
    setEditorTitle(title);
    setEditorError(null);
    setDraft(buildFormFromLocation(location));
    setEditorVisible(true);
  };

  const handleSuggestionPress = async (placeId: string) => {
    try {
      setSearchLoading(true);
      setSearchError(null);
      const location = await getPlaceDetails(placeId);
      openEditor(location, "Save location");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not load that address. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    try {
      setGpsLoading(true);
      setSearchError(null);
      const location = await getCurrentLocationSelection();
      openEditor(location, "Save current location");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Location permission is needed to use your current location. You can still search manually.");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSaveDraft = () => {
    if (!draft.formattedAddress.trim() && !draft.line1.trim()) {
      setEditorError("Address is required.");
      return;
    }
    if (!draft.city.trim()) {
      setEditorError("City is required.");
      return;
    }

    onSave({
      id: draft.id,
      label: draft.label || null,
      formattedAddress: draft.formattedAddress || draft.line1,
      line1: draft.line1 || draft.formattedAddress,
      line2: draft.line2 || null,
      city: draft.city || null,
      district: draft.district || null,
      phone: draft.phone || null,
      deliveryNotes: draft.deliveryNotes || null,
      latitude: draft.latitude,
      longitude: draft.longitude,
      placeId: draft.placeId || null,
      isDefault: draft.isDefault,
      source: draft.source || "manual",
    });
    setEditorVisible(false);
    setQuery("");
    setSuggestions([]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={THEME.navy} />
          </TouchableOpacity>
          <Text style={styles.title}>{editorVisible ? editorTitle : "Choose location"}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {!editorVisible ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <LocationSearchInput value={query} onChangeText={setQuery} onClear={() => setQuery("")} />

            <View style={styles.quickChips}>
              <TouchableOpacity
                style={[styles.quickChip, !homeLocation ? styles.quickChipDisabled : null]}
                onPress={() => {
                  if (homeLocation) onSelect(homeLocation);
                }}
                disabled={!homeLocation}
              >
                <Ionicons name="home-outline" size={14} color={homeLocation ? THEME.navy : "#94A3B8"} />
                <Text style={[styles.quickChipText, !homeLocation ? styles.quickChipTextDisabled : null]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickChip, !workLocation ? styles.quickChipDisabled : null]}
                onPress={() => {
                  if (workLocation) onSelect(workLocation);
                }}
                disabled={!workLocation}
              >
                <Ionicons name="briefcase-outline" size={14} color={workLocation ? THEME.navy : "#94A3B8"} />
                <Text style={[styles.quickChipText, !workLocation ? styles.quickChipTextDisabled : null]}>Work</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickChip} onPress={() => openEditor(null, "Add new address")}>
                <Ionicons name="add" size={14} color={THEME.navy} />
                <Text style={styles.quickChipText}>Add new</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.currentLocationCard} onPress={() => void handleCurrentLocation()}>
              <View style={styles.currentLocationIcon}>
                {gpsLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="locate" size={18} color="#FFFFFF" />}
              </View>
              <View style={styles.currentLocationCopy}>
                <Text style={styles.currentLocationTitle}>Use current location</Text>
                <Text style={styles.currentLocationText}>Turn on GPS and choose your current place.</Text>
              </View>
            </TouchableOpacity>

            {searchLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={THEME.modernAccentDark} />
                <Text style={styles.loadingText}>Searching addresses...</Text>
              </View>
            ) : null}

            {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}

            {suggestions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Search results</Text>
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.placeId}
                    style={styles.suggestionRow}
                    onPress={() => {
                      void handleSuggestionPress(suggestion.placeId);
                    }}
                  >
                    <Ionicons name="location-outline" size={18} color="#0284C7" />
                    <View style={styles.suggestionCopy}>
                      <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                      {suggestion.subtitle ? <Text style={styles.suggestionSub}>{suggestion.subtitle}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Saved locations</Text>
              {savedLocations.length > 0 ? (
                <View style={styles.savedList}>
                  {savedLocations.map((location) => (
                    <SavedLocationRow
                      key={location.id}
                      location={location}
                      selected={location.id === selectedLocation?.id}
                      onPress={() => onSelect(location)}
                      onEdit={() => openEditor(location, "Edit location")}
                      onDelete={() => onDelete(location.id)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No saved locations yet</Text>
                  <Text style={styles.emptyText}>Search for an address or use your current location to get started.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Selected address</Text>
              <Text style={styles.previewAddress}>{draft.formattedAddress || draft.line1 || "New address"}</Text>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.segmentRow}>
                {(["Home", "Work", "Other"] as const).map((option) => {
                  const active = draft.label === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.segmentChip, active ? styles.segmentChipActive : null]}
                      onPress={() => setDraft((current) => ({ ...current, label: option }))}
                    >
                      <Text style={[styles.segmentChipText, active ? styles.segmentChipTextActive : null]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Address line 1"
                placeholderTextColor="#94A3B8"
                value={draft.line1}
                onChangeText={(value) => setDraft((current) => ({ ...current, line1: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Address line 2 (optional)"
                placeholderTextColor="#94A3B8"
                value={draft.line2}
                onChangeText={(value) => setDraft((current) => ({ ...current, line2: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor="#94A3B8"
                value={draft.city}
                onChangeText={(value) => setDraft((current) => ({ ...current, city: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="District (optional)"
                placeholderTextColor="#94A3B8"
                value={draft.district}
                onChangeText={(value) => setDraft((current) => ({ ...current, district: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={draft.phone}
                onChangeText={(value) => setDraft((current) => ({ ...current, phone: value }))}
              />
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Delivery notes (optional)"
                placeholderTextColor="#94A3B8"
                value={draft.deliveryNotes}
                onChangeText={(value) => setDraft((current) => ({ ...current, deliveryNotes: value }))}
                multiline
              />

              <View style={styles.defaultRow}>
                <Text style={styles.defaultLabel}>Set as default</Text>
                <Switch
                  value={draft.isDefault}
                  onValueChange={(value) => setDraft((current) => ({ ...current, isDefault: value }))}
                />
              </View>
              {editorError ? <Text style={styles.errorText}>{editorError}</Text> : null}
              <View style={styles.footerActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditorVisible(false)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveDraft}>
                  <Text style={styles.primaryBtnText}>Save address</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EDF5",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.navy,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  quickChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickChip: {
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quickChipDisabled: {
    opacity: 0.5,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.navy,
  },
  quickChipTextDisabled: {
    color: "#94A3B8",
  },
  currentLocationCard: {
    borderRadius: 22,
    backgroundColor: "#F0F9FF",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  currentLocationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.modernAccentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  currentLocationCopy: {
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.navy,
  },
  currentLocationText: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 2,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: THEME.danger,
    fontWeight: "600",
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  suggestionRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  suggestionCopy: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.navy,
  },
  suggestionSub: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
  savedList: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: THEME.navy,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: THEME.textSecondary,
  },
  previewCard: {
    borderRadius: 20,
    backgroundColor: "#F0F9FF",
    padding: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284C7",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  previewAddress: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    color: THEME.navy,
  },
  formGrid: {
    gap: 12,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
  },
  segmentChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentChipActive: {
    backgroundColor: "#E0F2FE",
    borderColor: "#7DD3FC",
  },
  segmentChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.navy,
  },
  segmentChipTextActive: {
    color: "#0369A1",
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
    color: THEME.navy,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
  },
  notesInput: {
    minHeight: 92,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  defaultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  defaultLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.navy,
  },
  footerActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.navy,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: THEME.modernAccentDark,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
