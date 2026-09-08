import { Image, StyleSheet, View } from 'react-native';

const fieldBg = require('@/assets/images/field-bg.jpg');

interface Props {
  width: number;
  height: number;
  clipId?: string;
}

export function FieldSvg({ width, height, clipId }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, { width, height, borderRadius: 4, overflow: 'hidden' }]}>
      <Image
        source={fieldBg}
        style={{ width, height }}
        resizeMode="cover"
      />
    </View>
  );
}
