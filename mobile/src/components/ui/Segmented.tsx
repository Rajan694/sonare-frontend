import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { cn } from '../../lib/cn';

interface SegmentedControlProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  variant?: 'default' | 'cloud-device';
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  variant = 'default',
  className,
}: SegmentedControlProps) {
  const [containerWidth, setContainerWidth] = React.useState(140);
  const activeIndex = options.findIndex((opt) => opt.value === value);
  const slidePosition = useSharedValue(activeIndex);

  React.useEffect(() => {
    slidePosition.value = withSpring(activeIndex, {
      damping: 20,
      stiffness: 300,
    });
  }, [activeIndex, slidePosition]);

  const animatedStyle = useAnimatedStyle(() => {
    const itemWidth = (containerWidth - 8) / options.length;
    return {
      width: itemWidth,
      transform: [
        {
          translateX: slidePosition.value * itemWidth,
        },
      ],
    };
  }, [containerWidth, options.length]);

  const Component = Animated.View as any;

  return (
    <View 
      className={cn('flex-row bg-s2 rounded-lg p-1 relative min-w-[140px]', className)}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ position: 'absolute', top: 4, bottom: 4, left: 4, right: 4 }} collapsable={false}>
        <Component
          style={animatedStyle}
          className={cn(
            'rounded-md absolute top-0 bottom-0',
            variant === 'default' && 'bg-s3',
            variant === 'cloud-device' && value === 'online' && 'bg-accbg',
            variant === 'cloud-device' && value === 'offline' && 'bg-goldbg'
          )}
        />
      </View>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isActive }}
            className="flex-1 py-1.5 items-center justify-center z-10"
          >
            <Text
              numberOfLines={1}
              className={cn(
                'text-tm font-medium text-center',
                isActive && variant === 'default' && 'text-t1',
                isActive && variant === 'cloud-device' && option.value === 'online' && 'text-acc',
                isActive && variant === 'cloud-device' && option.value === 'offline' && 'text-gold',
                !isActive && 'text-t3'
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
