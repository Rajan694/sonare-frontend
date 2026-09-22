import React from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { cn } from '../../lib/cn';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  icon?: React.ReactNode;
  className?: string;
}

export function Field({ icon, className, ...props }: FieldProps) {
  return (
    <View className={cn('field', className)}>
      {icon}
      <TextInput
        {...props}
        className="flex-1 text-t1 text-bm font-sans"
        placeholderTextColor="#7E7E8C"
      />
    </View>
  );
}
