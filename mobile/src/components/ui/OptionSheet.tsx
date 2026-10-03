import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Sheet } from './Sheet';
import Icon, { type IconName } from './Icon';
import { cn } from '../../lib/cn';

export interface SheetOption<T extends string | number> {
  value: T;
  label: string;
  detail?: string;
  icon?: IconName;
}

interface OptionSheetProps<T extends string | number> {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  options: SheetOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  /** Gold in Offline Mode, green otherwise. */
  gold?: boolean;
  /** Below the list, e.g. a note or an extra action. */
  footer?: React.ReactNode;
}

/**
 * A themed pick-one list in a bottom sheet: the app's dropdown (sort order, audio output,
 * sleep timer, lyrics language). Picking an option closes it.
 */
export function OptionSheet<T extends string | number>({
  visible,
  onClose,
  title,
  description,
  options,
  value,
  onSelect,
  gold,
  footer,
}: OptionSheetProps<T>) {
  const accent = gold ? '#FFC24D' : '#00E28A';
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-4 gap-3">
        <View className="gap-1 px-1">
          <Text className="text-h2 font-semibold text-t1">{title}</Text>
          {description && <Text className="text-bs text-t3">{description}</Text>}
        </View>
        <ScrollView style={{ maxHeight: 380 }}>
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <Pressable
                key={String(o.value)}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
                className={cn(
                  'flex-row items-center gap-3.5 px-3 py-3 rounded-lg',
                  selected ? (gold ? 'bg-goldbg' : 'bg-accbg') : 'active:bg-s2',
                )}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={o.detail ? `${o.label}, ${o.detail}` : o.label}
              >
                {o.icon && (
                  <View className="w-9 h-9 rounded-sm bg-s3 items-center justify-center">
                    <Icon name={o.icon} size={18} color={selected ? accent : '#9A9AA8'} />
                  </View>
                )}
                <View className="flex-1 gap-0.5 min-w-0">
                  <Text className={cn('text-tm font-medium', selected ? (gold ? 'text-gold' : 'text-acc') : 'text-t1')}>
                    {o.label}
                  </Text>
                  {o.detail && (
                    <Text className="text-bs text-t3" numberOfLines={1}>
                      {o.detail}
                    </Text>
                  )}
                </View>
                {selected && <Icon name="check" size={18} color={accent} />}
              </Pressable>
            );
          })}
        </ScrollView>
        {footer}
      </View>
    </Sheet>
  );
}
