import React from 'react';
import { View, Pressable, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPRING_CONFIG = { damping: 20, stiffness: 300 };

export function Sheet({ visible, onClose, children }: SheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  
  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withTiming(0.6, { duration: 250 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG);
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible, translateY, opacity]);

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.translationY > 0) {
      translateY.value = event.nativeEvent.translationY;
    }
  };

  const onGestureEnd = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.translationY > 100 || event.nativeEvent.velocityY > 500) {
      translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG, () => {
        runOnJS(onClose)();
      });
      opacity.value = withTiming(0, { duration: 250 });
    } else {
      translateY.value = withSpring(0, SPRING_CONFIG);
    }
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const BackdropComponent = Animated.View as any;
  const SheetComponent = Animated.View as any;

  if (!visible && translateY.value === SCREEN_HEIGHT) return null;

  return (
    <View style={StyleSheet.absoluteFill} className="z-50 justify-end" pointerEvents={visible ? 'auto' : 'none'}>
      <BackdropComponent style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable className="flex-1 bg-black" onPress={onClose} />
      </BackdropComponent>
      
      <PanGestureHandler onGestureEvent={onGestureEvent as any} onEnded={onGestureEnd as any}>
        <SheetComponent style={sheetStyle} className="bg-s1 rounded-t-3xl pt-2 pb-8 border-t border-ln mt-24">
          <View className="w-12 h-1 bg-ln3 rounded-full self-center mb-6" />
          {children}
        </SheetComponent>
      </PanGestureHandler>
    </View>
  );
}
