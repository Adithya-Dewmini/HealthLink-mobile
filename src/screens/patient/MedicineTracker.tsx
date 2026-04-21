import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// --- Types ---
type Status = 'Completed' | 'Pending' | 'Missed';

interface TimeSlot {
  id: string;
  label: 'Morning' | 'Afternoon' | 'Night';
  time: string;
  status: Status;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  duration: string;
  slots: TimeSlot[];
}

// --- Dummy Data ---
const MEDICATIONS: Medication[] = [
  {
    id: '1',
    name: 'Metformin',
    dosage: '500mg',
    duration: 'Day 2 of 30',
    slots: [
      { id: 's1', label: 'Morning', time: '08:00 AM', status: 'Completed' },
      { id: 's2', label: 'Afternoon', time: '01:00 PM', status: 'Pending' },
      { id: 's3', label: 'Night', time: '08:00 PM', status: 'Pending' },
    ],
  },
  {
    id: '2',
    name: 'Amoxicillin',
    dosage: '250mg',
    duration: 'Day 5 of 7',
    slots: [
      { id: 's4', label: 'Morning', time: '09:00 AM', status: 'Missed' },
      { id: 's5', label: 'Afternoon', time: '02:00 PM', status: 'Completed' },
      { id: 's6', label: 'Night', time: '09:00 PM', status: 'Pending' },
    ],
  },
];

// --- Sub-Components ---

const TimeSlotRow: React.FC<{ slot: TimeSlot }> = ({ slot }) => {
  const renderStatus = () => {
    switch (slot.status) {
      case 'Completed':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={[styles.statusText, { color: '#10B981' }]}>Done</Text>
          </View>
        );
      case 'Missed':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="close-circle" size={22} color="#EF4444" />
            <Text style={[styles.statusText, { color: '#EF4444' }]}>Missed</Text>
          </View>
        );
      default:
        return (
          <TouchableOpacity style={styles.takeNowButton}>
            <Text style={styles.takeNowText}>Take Now</Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <View style={styles.slotRow}>
      <View>
        <Text style={styles.slotLabel}>{slot.label}</Text>
        <Text style={styles.slotTime}>{slot.time}</Text>
      </View>
      {renderStatus()}
    </View>
  );
};

const MedicationCard: React.FC<{ item: Medication }> = ({ item }) => (
  <View style={styles.medCard}>
    <View style={styles.medHeader}>
      <View>
        <Text style={styles.medName}>{item.name}</Text>
        <Text style={styles.medSubtext}>{item.dosage} • {item.duration}</Text>
      </View>
      <View style={styles.medIconPlaceholder}>
         {/* Placeholder for Medicine Icon/Illustration */}
         <Ionicons name="medical" size={24} color="#3B82F6" />
      </View>
    </View>
    <View style={styles.divider} />
    {item.slots.map((slot) => (
      <TimeSlotRow key={slot.id} slot={slot} />
    ))}
  </View>
);

// --- Main Screen ---

export default function MedicationTracker() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background */}
      <View style={styles.backgroundFill} />

      <FlatList
        data={MEDICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollPadding}
        ListHeaderComponent={() => (
          <>
            {/* Header Section */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={20} color="#1E293B" />
              </TouchableOpacity>
              <View>
                <Text style={styles.greeting}>Good Morning, John</Text>
                <Text style={styles.date}>Saturday, April 4</Text>
              </View>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/150?u=john' }} 
                style={styles.avatar} 
              />
            </View>

            {/* Progress Card */}
            <View style={styles.progressCard}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressTitle}>Today's Progress</Text>
                <Text style={styles.progressStats}>2 of 5 doses</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '40%' }]} />
              </View>
              <Text style={styles.motivationText}>
                Almost halfway there! Keeping consistent is key.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Your Schedule</Text>
          </>
        )}
        renderItem={({ item }) => <MedicationCard item={item} />}
      />
    </SafeAreaView>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E6EEFF',
  },
  scrollPadding: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  date: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 22,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 2,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  progressStats: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 5,
  },
  motivationText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 15,
  },
  medCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  medName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  medSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  medIconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    marginBottom: 15,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  slotTime: {
    fontSize: 13,
    color: '#94A3B8',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  takeNowButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  takeNowText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
