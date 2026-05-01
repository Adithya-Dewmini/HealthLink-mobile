import React, { useCallback } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PermissionsModal } from "../../features/medicalCenter/receptionists/components/PermissionsModal";
import { ReceptionistCard } from "../../features/medicalCenter/receptionists/components/ReceptionistCard";
import { ReceptionistsListHeader } from "../../features/medicalCenter/receptionists/components/ReceptionistsListHeader";
import { THEME } from "../../features/medicalCenter/receptionists/constants";
import { useReceptionists } from "../../features/medicalCenter/receptionists/hooks/useReceptionists";
import { styles } from "../../features/medicalCenter/receptionists/styles";
import type { Receptionist } from "../../features/medicalCenter/receptionists/types";
import type { MedicalCenterStackParamList } from "../../types/navigation";

export default function MedicalCenterReceptionists() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MedicalCenterStackParamList>>();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    receptionists,
    loading,
    stats,
    permissionModalVisible,
    selectedReceptionist,
    permissionDraft,
    setPermissionDraft,
    permissionLoading,
    permissionSaving,
    toggleReceptionist,
    resendInvite,
    openPermissionsModal,
    openActionMenu,
    savePermissions,
    closePermissionsModal,
  } = useReceptionists();

  const renderReceptionist = useCallback(
    ({ item }: { item: Receptionist }) => (
      <View style={styles.contentHorizontal}>
        <ReceptionistCard
          receptionist={item}
          onOpenPermissions={() => {
            void openPermissionsModal(item);
          }}
          onOpenMenu={() => openActionMenu(item)}
          onToggle={() => {
            void toggleReceptionist(item);
          }}
          onResendInvite={() => {
            void resendInvite(item);
          }}
        />
      </View>
    ),
    [openActionMenu, openPermissionsModal, resendInvite, toggleReceptionist]
  );

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="people-outline" size={32} color={THEME.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No receptionists found</Text>
        <Text style={styles.emptyText}>
          Start by adding new staff members to your clinic.
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="menu-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Receptionists</Text>
          <Text style={styles.headerSubtitle}>Manage clinic staff</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="options-outline" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={receptionists}
        keyExtractor={(item) => item.id}
        renderItem={renderReceptionist}
        ListHeaderComponent={
          <View style={styles.content}>
            <ReceptionistsListHeader
              search={search}
              onSearchChange={setSearch}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              stats={stats}
            />
          </View>
        }
        ListEmptyComponent={<View style={styles.contentHorizontal}>{renderEmpty()}</View>}
        ListFooterComponent={<View style={styles.listFooterSpace} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 46 }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("MedicalCenterAddReceptionist")}
      >
        <Ionicons name="add" size={30} color={THEME.white} />
      </TouchableOpacity>

      <PermissionsModal
        visible={permissionModalVisible}
        receptionist={selectedReceptionist}
        loading={permissionLoading}
        saving={permissionSaving}
        draft={permissionDraft}
        onClose={closePermissionsModal}
        onSave={() => {
          void savePermissions();
        }}
        onToggle={(key) =>
          setPermissionDraft((current) => ({ ...current, [key]: !current[key] }))
        }
      />
    </SafeAreaView>
  );
}
