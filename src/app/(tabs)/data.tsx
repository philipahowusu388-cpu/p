import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAppStore } from "../../lib/store";
import { ProfileCard } from "../../components/ProfileCard";
import { ProfilePickerModal } from "../../components/ProfilePickerModal";
import { ChangePasswordModal } from "../../components/ChangePasswordModal";
import { ExportImportCard } from "../../components/ExportImportCard";
import { SyncCard } from "../../components/SyncCard";
import { DoctorSummaryCard } from "../../components/DoctorSummaryCard";
import { NotificationsCard } from "../../components/NotificationsCard";
import { CustomSymptomsCard } from "../../components/CustomSymptomsCard";
import { ThemeToggle } from "../../components/ThemeToggle";
import {
  loadProfiles,
  findProfile,
  deleteProfile,
  setActiveProfileId,
  changeProfilePassword,
} from "../../lib/profiles";
import {
  clearCryptoKey,
  setCryptoKey,
  saveProfileData,
} from "../../lib/storage";
import { useTheme } from "../../lib/theme";
import type { Profile } from "../../types";

export default function DataScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const profileId = useAppStore((s) => s.profileId);
  const clearAll = useAppStore((s) => s.clearAll);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await loadProfiles();
      setProfiles(list);
    })();
  }, [pickerVisible, changePasswordVisible]);

  const currentProfile = findProfile(profiles, profileId);

  function lockNow() {
    Alert.alert("Lock now", "Lock the app immediately?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Lock",
        onPress: () => {
          clearCryptoKey();
          clearAll();
          router.replace("/lock");
        },
      },
    ]);
  }

  function handleAddProfile() {
    Alert.alert(
      "Add a new profile?",
      "Your current session will be locked. You'll create the new profile on the next screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            clearCryptoKey();
            clearAll();
            router.replace("/lock?add=1");
          },
        },
      ],
    );
  }

  function switchProfile(id: string) {
    setPickerVisible(false);
    Alert.alert(
      "Switch profile",
      "You'll need to enter the new profile's password.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: async () => {
            await setActiveProfileId(id);
            clearCryptoKey();
            clearAll();
            router.replace("/lock");
          },
        },
      ],
    );
  }

  function handleDeleteProfile(id: string) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    Alert.alert(
      `Delete profile "${p.name}"?`,
      "All data for this profile will be permanently deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteProfile(id);
            const list = await loadProfiles();
            setProfiles(list);
          },
        },
      ],
    );
  }

  function handleChangePasswordClick() {
    if (!currentProfile) {
      Alert.alert("No profile", "No active profile to change password for.");
      return;
    }
    setChangePasswordVisible(true);
  }

  async function handleChangePassword(newPassword: string) {
    if (!profileId) throw new Error("No active profile.");

    const state = useAppStore.getState();
    const currentData = {
      entries: state.entries,
      notes: state.dayNotes,
      contraceptives: state.contraceptives,
      contraceptiveLog: state.contraceptiveLog,
      customSymptoms: state.customSymptoms,
      bbtUnit: state.bbtUnit,
    };

    const newKey = await changeProfilePassword(profileId, newPassword);
    setCryptoKey(newKey);

    await saveProfileData(profileId, "entries", currentData.entries);
    await saveProfileData(profileId, "notes", currentData.notes);
    await saveProfileData(
      profileId,
      "contraceptives",
      currentData.contraceptives,
    );
    await saveProfileData(
      profileId,
      "contraceptiveLog",
      currentData.contraceptiveLog,
    );
    await saveProfileData(
      profileId,
      "customSymptoms",
      currentData.customSymptoms,
    );
    await saveProfileData(profileId, "bbtUnit", currentData.bbtUnit);
  }

  function handleDeleteAllData() {
    Alert.alert(
      "Delete all data",
      "Every period entry, note, contraceptive, and setting in this profile will be permanently deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: async () => {
            if (!profileId) return;
            await saveProfileData(profileId, "entries", []);
            await saveProfileData(profileId, "notes", {});
            await saveProfileData(profileId, "contraceptives", []);
            await saveProfileData(profileId, "contraceptiveLog", {});
            await saveProfileData(profileId, "customSymptoms", []);
            clearAll();
            await useAppStore.getState().loadForProfile(profileId);
            Alert.alert("Done", "All data has been deleted.");
          },
        },
      ],
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileCard
          currentProfile={currentProfile}
          onSwitch={() => setPickerVisible(true)}
          onAdd={handleAddProfile}
        />

        <ThemeToggle />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security</Text>

          <Pressable onPress={lockNow} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>🔒 Lock now</Text>
          </Pressable>

          <Pressable
            onPress={handleChangePasswordClick}
            style={styles.actionBtn}
          >
            <Text style={styles.actionBtnText}>🔑 Change password</Text>
          </Pressable>
        </View>

        <ExportImportCard profileName={currentProfile?.name ?? "backup"} />

        <SyncCard />

        <DoctorSummaryCard />

        <NotificationsCard />

        <CustomSymptomsCard />

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.cardTitle}>Danger zone</Text>
          <Text style={styles.dangerText}>These actions cannot be undone.</Text>

          <Pressable onPress={handleDeleteAllData} style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>
              Delete all data in this profile
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <ProfilePickerModal
        visible={pickerVisible}
        profiles={profiles}
        activeId={profileId}
        onClose={() => setPickerVisible(false)}
        onSelect={switchProfile}
        onDelete={handleDeleteProfile}
        onAdd={() => {
          setPickerVisible(false);
          handleAddProfile();
        }}
      />

      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
        onSubmit={handleChangePassword}
      />
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 16,
      paddingBottom: 48,
      gap: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.accentDeep,
      marginBottom: 12,
    },
    actionBtn: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      marginBottom: 8,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accentDeep,
    },
    dangerCard: {
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderStyle: "dashed",
    },
    dangerText: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 12,
    },
    dangerBtn: {
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.surface,
      alignItems: "center",
    },
    dangerBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.danger,
    },
  });
}
