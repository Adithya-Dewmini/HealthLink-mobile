import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { patientTheme } from '../../constants/patientTheme';

const THEME = patientTheme.colors;

interface GlassHeaderProps {
  name: string;
  onNotificationPress?: () => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
}

export default function GlassHeader({
  name,
  onNotificationPress,
  onSettingsPress,
  onProfilePress,
}: GlassHeaderProps) {
  return (
    <LinearGradient
      colors={[THEME.modernPrimary, THEME.modernPrimaryAlt]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView>
        <View style={styles.content}>
          <View style={styles.row}>
            <View style={styles.leftGroup}>
              <TouchableOpacity onPress={onProfilePress} activeOpacity={0.7}>
                <View style={styles.profileCircle}>
                  <Ionicons name="person-outline" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.nameBlock}>
                <Text style={styles.userNameText}>{name}</Text>
                <Text style={styles.greetingText}>Good Morning 👋</Text>
              </View>
            </View>

            <View style={styles.rightGroup}>
              <TouchableOpacity onPress={onNotificationPress} activeOpacity={0.7}>
                <BlurView intensity={80} tint="light" style={styles.glassCircle}>
                  <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                </BlurView>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSettingsPress} activeOpacity={0.7}>
                <BlurView intensity={80} tint="light" style={styles.glassCircle}>
                  <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                </BlurView>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameBlock: {
    marginLeft: 12,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greetingText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
