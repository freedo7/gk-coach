import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const colors = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.backgroundElement, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      <SkeletonBox width={80} height={10} borderRadius={4} />
      <SkeletonBox width="70%" height={20} borderRadius={6} />
      <SkeletonBox width={120} height={14} borderRadius={4} />
    </View>
  );
}

export function SkeletonMatchRow({ style }: { style?: ViewStyle }) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }, styles.matchRow, style]}>
      <View style={{ flex: 1, gap: Spacing.two }}>
        <SkeletonBox width={100} height={10} borderRadius={4} />
        <SkeletonBox width="60%" height={20} borderRadius={6} />
        <SkeletonBox width={80} height={12} borderRadius={4} />
      </View>
      <SkeletonBox width={40} height={40} borderRadius={20} />
    </View>
  );
}

export function SkeletonCategoryCard({ style }: { style?: ViewStyle }) {
  const colors = useTheme();
  return (
    <View style={[styles.categoryCard, { backgroundColor: colors.backgroundElement }, style]}>
      <SkeletonBox width={52} height={52} borderRadius={Radius.pill} />
      <SkeletonBox width={70} height={14} borderRadius={4} />
    </View>
  );
}

export function SkeletonStatCard({ style }: { style?: ViewStyle }) {
  const colors = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }, style]}>
      <SkeletonBox width={30} height={30} borderRadius={7} />
      <SkeletonBox width={80} height={10} borderRadius={4} />
      <SkeletonBox width={50} height={24} borderRadius={6} />
      <SkeletonBox width={60} height={10} borderRadius={4} />
    </View>
  );
}

export function SkeletonList({ count = 3, type = 'card' }: { count?: number; type?: 'card' | 'match' | 'category' | 'stat' }) {
  const Component =
    type === 'match' ? SkeletonMatchRow :
    type === 'category' ? SkeletonCategoryCard :
    type === 'stat' ? SkeletonStatCard :
    SkeletonCard;

  const isGrid = type === 'category' || type === 'stat';
  const gridGap = type === 'stat' ? Spacing.two : Spacing.three;

  return (
    <View style={isGrid ? [styles.grid, { gap: gridGap }] : { gap: Spacing.three }}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 120,
    justifyContent: 'center',
    width: '47%',
  },
  statCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    width: '48%',
    flexGrow: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
