import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { cn } from '../../lib/cn';
import Icon from './Icon';

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
  const [containerWidth, setContainerWidth] = React.useState(160);
  const activeIndex = options.findIndex((opt) => opt.value === value);
  const slidePosition = useSharedValue(activeIndex);

  React.useEffect(() => {
    slidePosition.value = withSpring(activeIndex, {
      damping: 24,
      stiffness: 320,
    });
  }, [activeIndex, slidePosition]);

  const animatedStyle = useAnimatedStyle(() => {
    const itemWidth = (containerWidth - 6) / options.length;
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
      className={cn('flex-row bg-s1 rounded-full p-[3px] relative border border-ln2', className)}
      style={{ gap: 2 }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ position: 'absolute', top: 3, bottom: 3, left: 3, right: 3 }} collapsable={false}>
        <Component
          style={animatedStyle}
          className={cn(
            'rounded-full absolute top-0 bottom-0',
            variant === 'default' && 'bg-s3',
            variant === 'cloud-device' && value === 'online' && 'bg-[rgba(0,226,138,0.20)] border border-[rgba(0,226,138,0.35)]',
            variant === 'cloud-device' && value === 'offline' && 'bg-[rgba(255,194,77,0.22)] border border-[rgba(255,194,77,0.35)]'
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
            className="flex-1 h-[30px] px-3 flex-row items-center justify-center gap-1.5 z-10 rounded-full"
          >
            {variant === 'cloud-device' && (
              option.value === 'online' ? (
                <Icon name="cloud" size={14} color={isActive ? '#00E28A' : '#7E7E8C'} />
              ) : (
                <Icon name="smartphone" size={14} color={isActive ? '#FFC24D' : '#7E7E8C'} />
              )
            )}
            <Text
              numberOfLines={1}
              className={cn(
                'text-[12px] font-semibold tracking-[0.2px] text-center',
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
