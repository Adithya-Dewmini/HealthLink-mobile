import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { DashboardBanner } from "../../services/dashboardBannerApi";

type DashboardBannerCarouselProps = {
  banners: DashboardBanner[];
  onPressBanner: (banner: DashboardBanner) => void;
};

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth - 32;
const CARD_HEIGHT = 156;
const AUTO_SCROLL_MS = 3500;

export default function DashboardBannerCarousel({
  banners,
  onPressBanner,
}: DashboardBannerCarouselProps) {
  const listRef = useRef<FlatList<DashboardBanner>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setActiveIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = current + 1 >= banners.length ? 0 : current + 1;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_MS);

    return () => clearInterval(timer);
  }, [banners.length]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActiveIndex(Math.max(0, Math.min(nextIndex, banners.length - 1)));
  }, [banners.length]);

  const markImageFailed = useCallback((id: string) => {
    setFailedImages((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const renderBanner = useCallback(
    ({ item }: { item: DashboardBanner }) => {
      const hasImage = item.imageUrl && !failedImages.has(item.id);
      const label = item.title?.trim() || "Dashboard banner";

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.card}
          onPress={() => onPressBanner(item)}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          {hasImage ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onError={() => markImageFailed(item.id)}
            />
          ) : (
            <LinearGradient
              colors={["#E0F2FE", "#F8FAFC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fallback}
            >
              <View style={styles.copy}>
                <Text style={styles.fallbackEyebrow}>HealthLink</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {label}
                </Text>
                {item.subtitle ? (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            </LinearGradient>
          )}
        </TouchableOpacity>
      );
    },
    [failedImages, markImageFailed, onPressBanner]
  );

  if (banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={banners}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.id}
        renderItem={renderBanner}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH,
          offset: CARD_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={handleMomentumEnd}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((banner, index) => (
            <View
              key={banner.id}
              style={[styles.dot, activeIndex === index ? styles.dotActive : null]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    alignSelf: "center",
    marginBottom: 6,
    zIndex: 3,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
  },
  copy: {
    paddingHorizontal: 18,
    paddingRight: 42,
  },
  fallbackEyebrow: {
    color: "#0A8FCA",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#0F172A",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  subtitle: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 6,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    position: "relative",
    zIndex: 4,
    elevation: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(148,163,184,0.45)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#38BDF8",
  },
});
