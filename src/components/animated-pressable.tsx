import { Pressable, type PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedView = Animated.View;

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
}

export function AnimatedPressable({ children, onPressIn, onPressOut, style, ...rest }: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView style={animatedStyle}>
      <Pressable
        onPressIn={(e) => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          onPressOut?.(e);
        }}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </AnimatedView>
  );
}
