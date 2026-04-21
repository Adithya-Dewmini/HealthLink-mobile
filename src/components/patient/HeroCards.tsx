import React, { useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const SPACING = 16;

const data: {
  title: string;
  subtitle: string;
  colors: [string, string];
  image?: ImageSourcePropType;
}[] = [
  {
    title: 'Consult Doctor',
    subtitle: 'Specialist care',
    colors: ['#A7F3D0', '#6EE7B7'],
    image: undefined,
  },
  {
    title: 'My Prescriptions',
    subtitle: 'View & manage',
    colors: ['#6366F1', '#8B5CF6'],
    image: undefined,
  },
  {
    title: 'Nearby Doctors & Pharmacies',
    subtitle: 'Search nearby',
    colors: ['#34D399', '#10B981'],
    image: undefined,
  },
];

export default function HeroCards() {
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {data.map((item, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + SPACING),
            index * (CARD_WIDTH + SPACING),
            (index + 1) * (CARD_WIDTH + SPACING),
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.7, 1, 0.7],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`${item.title}-${index}`}
              style={[styles.cardWrapper, { transform: [{ scale }], opacity }]}
            >
              <TouchableOpacity activeOpacity={0.9}>
                <LinearGradient
                  colors={["#FFFFFF", "#F8FAFC"]}
                  style={styles.cardContainer}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.iconBadge, { borderColor: item.colors[0] + "55" }]}>
                      <View style={[styles.iconDot, { backgroundColor: item.colors[0] }]} />
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: item.colors[1] + "22" }]}>
                      <Text style={[styles.statusPillText, { color: item.colors[1] }]}>
                        Action
                      </Text>
                    </View>
                  </View>

                  <View style={styles.textBlock}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  </View>

                  {item.image ? (
                    <Image
                      source={item.image}
                      style={styles.cardImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.imagePlaceholder, { borderColor: item.colors[0] + "35" }]} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 5,
    marginBottom: 15,
  },
  scrollContainer: {
    paddingHorizontal: 0,
    paddingRight: 20,
    paddingBottom: 4,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: SPACING,
  },
  cardContainer: {
    height: 160,
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  iconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  textBlock: {
    width: "70%",
  },
  cardTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    position: 'absolute',
    right: -10,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  cardImage: {
    width: 120,
    height: 120,
    position: 'absolute',
    right: -10,
    bottom: 0,
  },
});
