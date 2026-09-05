import { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View, ViewToken } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  icon: string;
  gradient: [string, string, string];
  titleKey: string;
  subtitleKey: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'fitness-outline',
    gradient: ['#0A0F0A', '#1A2E12', '#0A0F0A'],
    titleKey: 'onboarding.slide1Title',
    subtitleKey: 'onboarding.slide1Subtitle',
  },
  {
    icon: 'football-outline',
    gradient: ['#0A0A0F', '#12192E', '#0A0A0F'],
    titleKey: 'onboarding.slide2Title',
    subtitleKey: 'onboarding.slide2Subtitle',
  },
  {
    icon: 'bar-chart-outline',
    gradient: ['#0F0A0A', '#2E1A12', '#0F0A0A'],
    titleKey: 'onboarding.slide3Title',
    subtitleKey: 'onboarding.slide3Subtitle',
  },
];

function SlideItem({ slide, index, scrollX }: { slide: Slide; index: number; scrollX: { value: number } }) {
  const { t } = useTranslation();

  const animStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0]),
      transform: [
        { scale: interpolate(scrollX.value, inputRange, [0.8, 1, 0.8]) },
      ],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    return {
      transform: [
        { translateY: interpolate(scrollX.value, inputRange, [60, 0, -60]) },
        { rotate: `${interpolate(scrollX.value, inputRange, [-15, 0, 15])}deg` },
      ],
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0]),
    };
  });

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <LinearGradient colors={slide.gradient} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <View style={styles.iconGlow}>
          <Ionicons name={slide.icon as any} size={80} color="#6FC22C" />
        </View>
      </Animated.View>
      <Animated.View style={[styles.textContainer, animStyle]}>
        <ThemedText style={styles.title}>{t(slide.titleKey)}</ThemedText>
        <ThemedText style={styles.subtitle}>{t(slide.subtitleKey)}</ThemedText>
      </Animated.View>
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: { value: number } }) {
  const style = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    return {
      width: interpolate(scrollX.value, inputRange, [8, 28, 8]),
      opacity: interpolate(scrollX.value, inputRange, [0.3, 1, 0.3]),
      backgroundColor: '#6FC22C',
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const buttonScale = useSharedValue(1);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onComplete();
    }
  }

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient colors={['#0A0F0A', '#111311', '#0A0F0A']} style={StyleSheet.absoluteFill} />

      {/* Skip button */}
      {!isLast && (
        <Animated.View entering={FadeIn.delay(500)} style={styles.skipContainer}>
          <Pressable onPress={onComplete} hitSlop={16}>
            <ThemedText style={styles.skipText}>{t('onboarding.skip')}</ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={(e) => { scrollX.value = e.nativeEvent.contentOffset.x; }}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => <SlideItem slide={item} index={index} scrollX={scrollX} />}
        keyExtractor={(_, i) => String(i)}
      />

      {/* Bottom controls */}
      <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.bottomControls}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        {/* Next / Get Started button */}
        <Animated.View style={buttonAnimStyle}>
          <Pressable
            onPress={handleNext}
            onPressIn={() => { buttonScale.value = withSpring(0.95); }}
            onPressOut={() => { buttonScale.value = withSpring(1); }}
            style={[styles.nextButton, isLast && styles.nextButtonWide]}>
            {isLast ? (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.nextButtonInner}>
                <ThemedText style={styles.nextButtonText}>{t('onboarding.getStarted')}</ThemedText>
                <Ionicons name="arrow-forward" size={20} color="#0F1A05" />
              </Animated.View>
            ) : (
              <Ionicons name="arrow-forward" size={24} color="#0F1A05" />
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F0A',
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: Spacing.four,
    zIndex: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  iconContainer: {
    marginBottom: 48,
  },
  iconGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(111, 194, 44, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(111, 194, 44, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6FC22C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.four,
  },
  bottomControls: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6FC22C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6FC22C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButtonWide: {
    width: SCREEN_WIDTH - Spacing.four * 2,
    borderRadius: 16,
    height: 56,
  },
  nextButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  nextButtonText: {
    color: '#0F1A05',
    fontSize: 18,
    fontWeight: '700',
  },
});
