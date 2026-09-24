import React from 'react';
import { View, Pressable, Dimensions, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

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
  
  // Stays mounted until the close animation settles. Tracked in state because reading
  // translateY.value during render is not reactive (and Reanimated warns about it).
  const [mounted, setMounted] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withTiming(0.6, { duration: 250 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, SPRING_CONFIG, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
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

  if (!visible && !mounted) return null;

  // A Modal, so the sheet covers the whole screen wherever it's declared (e.g. inside a
  // list row) instead of being clipped by, and drawn under, its siblings. Gesture handlers
  // need their own root view inside a Modal on Android.
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <View style={StyleSheet.absoluteFill} className="justify-end" pointerEvents={visible ? 'auto' : 'none'}>
          <BackdropComponent style={[StyleSheet.absoluteFill, backdropStyle]}>
            <Pressable className="flex-1 bg-black" onPress={onClose} accessibilityLabel="Close" />
          </BackdropComponent>

          <PanGestureHandler onGestureEvent={onGestureEvent as any} onEnded={onGestureEnd as any}>
            <SheetComponent style={sheetStyle} className="bg-s1 rounded-t-3xl pt-2 pb-8 border-t border-ln mt-24">
              <View className="w-12 h-1 bg-ln3 rounded-full self-center mb-6" />
              {children}
            </SheetComponent>
          </PanGestureHandler>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
