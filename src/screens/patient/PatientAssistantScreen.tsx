import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PatientStackParamList } from "../../types/navigation";
import ChatBubble from "../../components/chat/ChatBubble";
import QuickReplyButton from "../../components/chat/QuickReplyButton";
import TypingIndicator from "../../components/chat/TypingIndicator";
import ChatSuggestionBar from "../../components/chat/ChatSuggestionBar";
import {
  getChatbotRecoverySuggestions,
  sendPatientChatMessage,
  type MedicineRecommendation,
  type PatientAssistantExtracted,
  type PatientAssistantRiskLevel,
  type PatientChatbotAction,
  type PatientChatbotResponse,
  type PharmacyRecommendation,
} from "../../services/chatbotApi";

type PatientNavigation = NativeStackNavigationProp<PatientStackParamList>;

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  riskLevel?: PatientAssistantRiskLevel;
  extracted?: PatientAssistantExtracted;
  actions: PatientChatbotAction[];
  suggestions: string[];
  medicineResults?: MedicineRecommendation[];
  pharmacyResults?: PharmacyRecommendation[];
};

type StoredChatState = {
  conversationId?: string;
  messages: ChatMessage[];
};

const STORAGE_KEY = "healthlink.medimate.advanced.v1";

const THEME = {
  bg: "#F4FBFD",
  textPrimary: "#13324A",
  textSecondary: "#5E7386",
  brand: "#0F766E",
  brandDark: "#123F73",
  white: "#FFFFFF",
  shadow: "#0B3954",
};

const DEFAULT_SUGGESTIONS = ["Book doctor", "My queue", "Prescriptions", "Medical records"];
const HEALTH_SUGGESTIONS = ["Find doctor", "Book appointment", "Ask another question"];
const PHARMACY_SUGGESTIONS = ["Search pharmacy", "My orders", "Show my prescriptions"];
const STARTERS = [
  { label: "Book a doctor", message: "I want to book a doctor" },
  { label: "Check my queue", message: "What is my queue number?" },
  { label: "Show prescriptions", message: "Show my prescriptions" },
  { label: "I have fever", message: "I have fever" },
] as const;

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isChatMessage = (value: unknown): value is ChatMessage => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    (candidate.role === "user" || candidate.role === "bot") &&
    typeof candidate.text === "string" &&
    Array.isArray(candidate.actions) &&
    Array.isArray(candidate.suggestions)
  );
};

const normalizeStoredState = (value: unknown): StoredChatState => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    return {
      conversationId: typeof candidate.conversationId === "string" ? candidate.conversationId : undefined,
      messages: Array.isArray(candidate.messages) ? candidate.messages.filter(isChatMessage) : [],
    };
  }

  if (Array.isArray(value)) {
    return { messages: value.filter(isChatMessage) };
  }

  return { messages: [] };
};

export default function PatientAssistantScreen() {
  const navigation = useNavigation<PatientNavigation>();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  const persistState = useCallback(async (nextMessages: ChatMessage[], nextConversationId?: string) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          conversationId: nextConversationId,
          messages: nextMessages,
        } satisfies StoredChatState)
      );
    } catch (error) {
      console.log("Persist MediMate chat error:", error);
    }
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setMessages([]);
          setConversationId(undefined);
          return;
        }
        const normalized = normalizeStoredState(JSON.parse(raw) as unknown);
        setMessages(normalized.messages);
        setConversationId(normalized.conversationId);
      } catch (error) {
        console.log("Load MediMate chat error:", error);
        setMessages([]);
        setConversationId(undefined);
      } finally {
        setHistoryLoaded(true);
      }
    };

    void loadHistory();
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (messages.length > 0) {
        listRef.current?.scrollToEnd({ animated: true });
      }
    });
  }, [messages.length]);

  useEffect(() => {
    if (historyLoaded) {
      scrollToBottom();
    }
  }, [historyLoaded, messages, scrollToBottom]);

  const setAndPersistMessages = useCallback(
    (updater: (current: ChatMessage[]) => ChatMessage[], nextConversationId?: string) => {
      setMessages((current) => {
        const nextMessages = updater(current);
        void persistState(nextMessages, nextConversationId ?? conversationId);
        return nextMessages;
      });
    },
    [conversationId, persistState]
  );

  const pushBotReply = useCallback(
    (response: PatientChatbotResponse) => {
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }
      setAndPersistMessages(
        (current) => [
          ...current,
          {
            id: createId(),
            role: "bot",
            text: response.reply,
            riskLevel: response.riskLevel,
            extracted: response.extracted,
            actions: response.actions,
            suggestions: response.suggestions,
            medicineResults: response.medicineResults,
            pharmacyResults: response.pharmacyResults,
          },
        ],
        response.conversationId
      );
    },
    [setAndPersistMessages]
  );

  const latestBotMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "bot"),
    [messages]
  );

  const suggestionItems = useMemo(() => {
    if (latestBotMessage?.suggestions?.length) {
      return latestBotMessage.suggestions;
    }
    if (latestBotMessage?.riskLevel === "LOW" || latestBotMessage?.riskLevel === "MODERATE") {
      return HEALTH_SUGGESTIONS;
    }
    if (
      latestBotMessage?.actions.some((action) =>
        [
          "OPEN_PHARMACY_SEARCH",
          "OPEN_CART",
          "OPEN_ORDER_STATUS",
          "OPEN_PRESCRIPTION_ORDER",
        ].includes(action.type)
      )
    ) {
      return PHARMACY_SUGGESTIONS;
    }
    return DEFAULT_SUGGESTIONS;
  }, [latestBotMessage]);

  const submitMessage = useCallback(
    async (rawMessage: string, actionPayload?: Record<string, unknown>) => {
      const message = rawMessage.trim();
      if (!message || loading) return;

      setAndPersistMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "user",
          text: message,
          actions: [],
          suggestions: [],
        },
      ]);
      setInput("");
      setLoading(true);
      scrollToBottom();

      try {
        const response = await sendPatientChatMessage({
          message,
          conversationId,
          actionPayload,
        });
        pushBotReply(response);
      } catch {
        pushBotReply({
          reply: "I’m having trouble connecting right now. Please try again.",
          intent: "UNKNOWN",
          riskLevel: "NONE",
          extracted: {},
          actions: [],
          suggestions: getChatbotRecoverySuggestions(),
          medicineResults: [],
          pharmacyResults: [],
          conversationId,
        });
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading, pushBotReply, scrollToBottom, setAndPersistMessages]
  );

  const handleActionPress = useCallback(
    (action: PatientChatbotAction, payloadOverride?: Record<string, unknown>) => {
      if (payloadOverride) {
        void submitMessage("Selected this session", payloadOverride);
        return;
      }

      switch (action.type) {
        case "OPEN_DOCTOR_SEARCH": {
          const initialQuery =
            typeof action.payload?.initialQuery === "string" ? action.payload.initialQuery : undefined;
          const specialty =
            typeof action.payload?.specialty === "string" ? action.payload.specialty : undefined;
          const reason = typeof action.payload?.reason === "string" ? action.payload.reason : undefined;
          const preferredDate =
            typeof action.payload?.preferredDate === "string" ? action.payload.preferredDate : undefined;
          const preferredTime =
            typeof action.payload?.preferredTime === "string" ? action.payload.preferredTime : undefined;
          navigation.navigate("DoctorSearchScreen", {
            ...(initialQuery ? { initialQuery } : {}),
            ...(specialty ? { specialty } : {}),
            ...(reason ? { reason } : {}),
            ...(preferredDate ? { preferredDate } : {}),
            ...(preferredTime ? { preferredTime } : {}),
          });
          break;
        }
        case "OPEN_QUEUE":
          navigation.navigate("PatientQueue", {});
          break;
        case "OPEN_APPOINTMENTS":
          navigation.navigate("Appointments");
          break;
        case "OPEN_PRESCRIPTIONS":
          navigation.navigate("PatientPrescriptions");
          break;
        case "OPEN_PHARMACY_SEARCH":
          navigation.navigate("PharmacyMarketplace", {
            initialQuery:
              typeof action.payload?.initialQuery === "string" ? action.payload.initialQuery : undefined,
            medicineName:
              typeof action.payload?.medicineName === "string" ? action.payload.medicineName : undefined,
            category: typeof action.payload?.category === "string" ? action.payload.category : undefined,
            reason: typeof action.payload?.reason === "string" ? action.payload.reason : undefined,
          });
          break;
        case "OPEN_PHARMACY_PRODUCT": {
          const productId = typeof action.payload?.productId === "string" ? action.payload.productId : undefined;
          const pharmacyId =
            typeof action.payload?.pharmacyId === "number"
              ? action.payload.pharmacyId
              : typeof action.payload?.pharmacyId === "string"
                ? Number(action.payload.pharmacyId)
                : NaN;
          if (productId && Number.isFinite(pharmacyId)) {
            navigation.navigate("PharmacyProductDetails", { productId, pharmacyId });
          } else {
            navigation.navigate("PharmacyMarketplace");
          }
          break;
        }
        case "OPEN_CART":
          navigation.navigate("Cart");
          break;
        case "OPEN_ORDER_STATUS":
          navigation.navigate("Orders");
          break;
        case "OPEN_PRESCRIPTION_ORDER": {
          const prescriptionId =
            typeof action.payload?.prescriptionId === "string" ? action.payload.prescriptionId : undefined;
          if (prescriptionId) {
            navigation.navigate("PrescriptionFulfillment", { prescriptionId });
          } else {
            navigation.navigate("PatientPrescriptions");
          }
          break;
        }
        case "BOOK_DOCTOR_FOR_MEDICINE":
          navigation.navigate("DoctorSearchScreen", {
            initialQuery: "General Physician",
            specialty: "General Physician",
          });
          break;
        case "OPEN_MEDICAL_RECORDS":
          navigation.navigate("MedicalHistoryScreen");
          break;
        case "CONFIRM_BOOKING":
          void submitMessage("Confirm booking", action.payload);
          break;
        case "CONFIRM_ADD_TO_CART":
          void submitMessage("Confirm add to cart", action.payload);
          break;
        case "ADD_TO_CART":
          void submitMessage("Add this item to cart", action.payload);
          break;
        case "CALL_EMERGENCY":
          Alert.alert("Urgent medical care", "Please contact local emergency support immediately.");
          break;
        case "ASK_FOLLOW_UP":
          inputRef.current?.focus();
          break;
        case "CLEAR_CONTEXT":
          setMessages([]);
          setConversationId(undefined);
          void AsyncStorage.removeItem(STORAGE_KEY);
          break;
        default:
          break;
      }
    },
    [navigation, submitMessage]
  );

  const clearChat = useCallback(() => {
    Alert.alert("Clear MediMate chat?", "This will remove your local assistant chat history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setMessages([]);
          setConversationId(undefined);
          void AsyncStorage.removeItem(STORAGE_KEY);
        },
      },
    ]);
  }, []);

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const previous = index > 0 ? messages[index - 1] : null;
      const showAvatar = item.role === "bot" && previous?.role !== "bot";
      const compact = previous?.role === item.role;

      return (
        <ChatBubble
          role={item.role}
          text={item.text}
          riskLevel={item.riskLevel}
          actions={item.actions}
          onPressAction={handleActionPress}
          medicineResults={item.medicineResults}
          pharmacyResults={item.pharmacyResults}
          onPressMedicinePrimary={(medicine) => {
            if (medicine.requiresPrescription) {
              navigation.navigate("PatientPrescriptions");
              return;
            }
            if (medicine.stockStatus === "OUT_OF_STOCK") {
              navigation.navigate("PharmacyMarketplace");
              return;
            }
            void submitMessage("Add this item to cart", {
              type: "ADD_TO_CART",
              productId: medicine.productId,
              quantity: 1,
              requiresPrescription: Boolean(medicine.requiresPrescription),
            });
          }}
          onPressMedicineDetails={(medicine) => {
            const pharmacyId = Number(medicine.pharmacyId ?? 0);
            if (medicine.productId && Number.isFinite(pharmacyId) && pharmacyId > 0) {
              navigation.navigate("PharmacyProductDetails", {
                productId: medicine.productId,
                pharmacyId,
              });
            } else {
              navigation.navigate("PharmacyMarketplace");
            }
          }}
          onPressPharmacyResult={() => navigation.navigate("PharmacyMarketplace")}
          showAvatar={showAvatar}
          compact={compact}
        />
      );
    },
    [handleActionPress, messages, navigation, submitMessage]
  );

  const emptyState = (
    <View style={styles.emptyWrap}>
      <LinearGradient colors={["#E7FBFF", "#F8FDFF"]} style={styles.emptyAvatar}>
        <Ionicons name="sparkles" size={40} color={THEME.brand} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Hi, I’m MediMate</Text>
      <Text style={styles.emptySubtitle}>
        I can help you book doctors, check your queue, view prescriptions, and answer simple health questions.
      </Text>
      <View style={styles.starterGrid}>
        {STARTERS.map((item, index) => (
          <QuickReplyButton
            key={item.label}
            label={item.label}
            variant={index === 0 ? "primary" : "secondary"}
            onPress={() => void submitMessage(item.message)}
          />
        ))}
      </View>
      <Text style={styles.safetyNote}>For emergencies, seek urgent medical care immediately.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
      >
        <View style={styles.backgroundGlowTop} />
        <View style={styles.backgroundGlowBottom} />

        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.88}
          >
            <Ionicons name="chevron-back" size={22} color={THEME.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>MediMate</Text>
              <View style={styles.headerStatusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSubtitle}>Online • Patient assistant</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            accessibilityLabel="Clear MediMate chat"
            style={styles.iconButton}
            onPress={clearChat}
            activeOpacity={0.88}
          >
            <Ionicons name="trash-outline" size={18} color={THEME.textPrimary} />
          </TouchableOpacity>
        </View>

        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>{emptyState}</View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListFooterComponent={loading ? <TypingIndicator /> : <View style={{ height: 10 }} />}
          />
        )}

        <View style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ChatSuggestionBar
            suggestions={suggestionItems}
            onPressSuggestion={(suggestion) => void submitMessage(suggestion)}
          />
          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              accessibilityLabel="Message MediMate"
              value={input}
              onChangeText={setInput}
              placeholder="Message MediMate…"
              placeholderTextColor="#7A90A3"
              style={styles.input}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <TouchableOpacity
              accessibilityLabel="Send message"
              style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
              onPress={() => void submitMessage(input)}
              disabled={!input.trim() || loading}
              activeOpacity={0.88}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  keyboardWrap: {
    flex: 1,
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#D7F7FA",
    opacity: 0.7,
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: 100,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E8F4FF",
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: THEME.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.brand,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    color: THEME.textPrimary,
    fontWeight: "800",
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  emptyAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: THEME.textPrimary,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 26,
    color: THEME.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
  starterGrid: {
    marginTop: 22,
    width: "100%",
    gap: 10,
  },
  safetyNote: {
    marginTop: 18,
    fontSize: 14,
    lineHeight: 20,
    color: "#A16207",
    fontWeight: "700",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  composerDock: {
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: "rgba(244,251,253,0.74)",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    shadowColor: THEME.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 90,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 17,
    lineHeight: 24,
    color: THEME.textPrimary,
    fontWeight: "500",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.brandDark,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
