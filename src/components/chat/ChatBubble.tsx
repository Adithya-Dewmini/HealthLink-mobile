import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type {
  MedicineRecommendation,
  PatientAssistantRiskLevel,
  PatientAssistantSessionCard,
  PatientChatbotAction,
  PharmacyRecommendation,
} from "../../services/chatbotApi";
import ChatActionCard from "./ChatActionCard";
import MedicineResultCard from "./MedicineResultCard";
import PharmacyResultCard from "./PharmacyResultCard";
import SessionResultCard from "./SessionResultCard";

type Props = {
  role: "user" | "bot";
  text: string;
  riskLevel?: PatientAssistantRiskLevel;
  actions?: PatientChatbotAction[];
  onPressAction?: (action: PatientChatbotAction, payloadOverride?: Record<string, unknown>) => void;
  medicineResults?: MedicineRecommendation[];
  pharmacyResults?: PharmacyRecommendation[];
  onPressMedicinePrimary?: (item: MedicineRecommendation) => void;
  onPressMedicineDetails?: (item: MedicineRecommendation) => void;
  onPressPharmacyResult?: (item: PharmacyRecommendation) => void;
  showAvatar?: boolean;
  compact?: boolean;
};

const RISK_META: Record<Exclude<PatientAssistantRiskLevel, "NONE">, { label: string; bg: string; text: string }> = {
  LOW: { label: "General guidance", bg: "#E8F7F4", text: "#0F766E" },
  MODERATE: { label: "Doctor recommended", bg: "#FFF4E5", text: "#B45309" },
  URGENT: { label: "Urgent care", bg: "#FDECEC", text: "#DC2626" },
};

const getSessionCards = (action: PatientChatbotAction): PatientAssistantSessionCard[] => {
  const sessions = action.payload?.sessions;
  return Array.isArray(sessions)
    ? sessions.filter(
        (item): item is PatientAssistantSessionCard =>
          !!item &&
          typeof item === "object" &&
          typeof (item as PatientAssistantSessionCard).sessionId === "string" &&
          typeof (item as PatientAssistantSessionCard).doctorName === "string"
      )
    : [];
};

const buildActionSubtitle = (action: PatientChatbotAction) => {
  const specialty = typeof action.payload?.specialty === "string" ? action.payload.specialty : null;
  const reason = typeof action.payload?.reason === "string" ? action.payload.reason : null;
  if (action.type === "OPEN_DOCTOR_SEARCH") {
    if (specialty && reason) return `${specialty} for ${reason}`;
    if (specialty) return specialty;
    if (reason) return `Suggested for ${reason}`;
  }
  if (action.type === "CALL_EMERGENCY") {
    return "Please seek urgent medical care immediately.";
  }
  if (action.type === "CONFIRM_BOOKING") {
    return "This is the final booking step.";
  }
  if (action.type === "CONFIRM_ADD_TO_CART") {
    return "This only adds the item to your cart after you confirm.";
  }
  if (action.type === "BOOK_DOCTOR_FOR_MEDICINE") {
    return "Use this if you need medical review before ordering.";
  }
  return null;
};

export default function ChatBubble({
  role,
  text,
  riskLevel = "NONE",
  actions = [],
  onPressAction,
  medicineResults = [],
  pharmacyResults = [],
  onPressMedicinePrimary,
  onPressMedicineDetails,
  onPressPharmacyResult,
  showAvatar = true,
  compact = false,
}: Props) {
  const isBot = role === "bot";

  return (
    <View style={[styles.row, isBot ? styles.rowBot : styles.rowUser, compact ? styles.rowCompact : null]}>
      {isBot ? (
        <View style={[styles.avatarSlot, !showAvatar ? styles.avatarSlotHidden : null]}>
          {showAvatar ? (
            <View style={styles.avatar}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.column, isBot ? styles.columnBot : styles.columnUser]}>
        <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser, compact ? styles.bubbleCompact : null]}>
          {isBot && riskLevel !== "NONE" ? (
            <View style={[styles.riskBadge, { backgroundColor: RISK_META[riskLevel].bg }]}>
              <Text style={[styles.riskText, { color: RISK_META[riskLevel].text }]}>{RISK_META[riskLevel].label}</Text>
            </View>
          ) : null}
          <Text style={[styles.message, isBot ? styles.messageBot : styles.messageUser]}>{text}</Text>
        </View>

        {isBot && (actions.length > 0 || medicineResults.length > 0 || pharmacyResults.length > 0) ? (
          <View style={styles.actionStack}>
            {medicineResults.length > 0 && onPressMedicinePrimary && onPressMedicineDetails ? (
              <View style={styles.sessionStack}>
                {medicineResults.map((item) => (
                  <MedicineResultCard
                    key={item.productId}
                    item={item}
                    onPressPrimary={onPressMedicinePrimary}
                    onPressViewDetails={onPressMedicineDetails}
                  />
                ))}
              </View>
            ) : null}

            {pharmacyResults.length > 0 && onPressPharmacyResult ? (
              <View style={styles.sessionStack}>
                {pharmacyResults.map((item) => (
                  <PharmacyResultCard key={item.pharmacyId} item={item} onPress={onPressPharmacyResult} />
                ))}
              </View>
            ) : null}

            {actions.length > 0 && onPressAction
              ? actions.map((action) => {
                  if (
                    (action.type === "SHOW_MEDICINE_RESULTS" && medicineResults.length > 0) ||
                    (action.type === "SHOW_PHARMACY_RESULTS" && pharmacyResults.length > 0)
                  ) {
                    return null;
                  }

                  if (action.type === "SHOW_SESSION_RESULTS") {
                    const sessions = getSessionCards(action);
                    return (
                      <View key={`${action.type}-${action.label}`} style={styles.sessionStack}>
                        {sessions.map((session) => (
                          <SessionResultCard
                            key={session.sessionId}
                            session={session}
                            onPress={() =>
                              onPressAction(action, {
                                type: "SELECT_SESSION",
                                sessionId: session.sessionId,
                                session,
                              })
                            }
                          />
                        ))}
                      </View>
                    );
                  }

                  return (
                    <ChatActionCard
                      key={`${action.type}-${action.label}`}
                      action={action}
                      subtitle={buildActionSubtitle(action) || undefined}
                      onPress={() => onPressAction(action)}
                    />
                  );
                })
              : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 18,
    alignItems: "flex-end",
  },
  rowCompact: {
    marginBottom: 8,
  },
  rowBot: {
    justifyContent: "flex-start",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  avatarSlot: {
    width: 40,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  avatarSlotHidden: {
    opacity: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F766E",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  column: {
    maxWidth: "84%",
  },
  columnBot: {
    alignItems: "flex-start",
  },
  columnUser: {
    alignItems: "flex-end",
  },
  bubble: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  bubbleCompact: {
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderBottomLeftRadius: 8,
    shadowColor: "#0B3954",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: "#154B88",
    borderBottomRightRadius: 8,
    shadowColor: "#154B88",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  riskBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  riskText: {
    fontSize: 12,
    fontWeight: "800",
  },
  message: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "600",
  },
  messageBot: {
    color: "#16324A",
  },
  messageUser: {
    color: "#FFFFFF",
  },
  actionStack: {
    marginTop: 8,
    gap: 10,
    width: "100%",
  },
  sessionStack: {
    gap: 10,
  },
});
