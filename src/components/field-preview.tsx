import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';

import { FieldSvg } from '@/components/field-svg';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { ELEMENT_SIZE_RATIO, HALF_FIELD_RATIO, getElementIcon, getElementColor } from '@/constants/field';
import { FIELD_ELEMENT_IMAGES } from '@/constants/field-images';
import type { FieldElement } from '@/types/database';

function StaticElement({ element, fieldW, fieldH, normalized }: { element: FieldElement; fieldW: number; fieldH: number; normalized: boolean }) {
  const posX = normalized ? element.x * fieldW : element.x * (fieldW / 400);
  const posY = normalized ? element.y * fieldH : element.y * (fieldH / 310);
  const baseSize = fieldW * ELEMENT_SIZE_RATIO;
  const size = baseSize;
  const iconSize = baseSize * 0.88;
  const color = element.color ?? getElementColor(element.type);

  if (element.type === 'arrow') {
    const rawLen = element.length ?? (normalized ? 0.12 : 80);
    const len = normalized ? rawLen * fieldW : rawLen * (fieldW / 400);
    const sw = Math.max(1, 2 * Math.max(0.6, ELEMENT_SIZE_RATIO * fieldW / 36));
    const headSize = Math.max(5, 10 * Math.max(0.6, ELEMENT_SIZE_RATIO * fieldW / 36));
    const ls = element.lineStyle ?? 'solid';
    const rad = (element.rotation * Math.PI) / 180;
    const ex = posX + len * Math.cos(rad);
    const ey = posY + len * Math.sin(rad);
    const hAngle = Math.atan2(ey - posY, ex - posX);

    let linePath: string;
    let strokeDash: string | undefined;
    let headPath: string;
    let headFill: string = 'none';
    if (ls === 'curved') {
      // Sinusoidal wave — shorten to leave room for filled arrowhead
      const waveLen = len - headSize;
      const rawPeriods = Math.max(2, waveLen / 30);
      const fullPeriods = Math.round(rawPeriods);
      const amp = Math.max(3, 6 * Math.max(0.6, ELEMENT_SIZE_RATIO * fieldW / 36));
      const steps = Math.max(24, fullPeriods * 16);
      const perpX = -Math.sin(rad);
      const perpY = Math.cos(rad);
      linePath = `M ${posX} ${posY}`;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const wave = amp * Math.sin(t * fullPeriods * 2 * Math.PI);
        const px = posX + t * waveLen * Math.cos(rad) + wave * perpX;
        const py = posY + t * waveLen * Math.sin(rad) + wave * perpY;
        linePath += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      }
      // Filled triangle head — base centered on axis at wave end, tip at arrow end
      const bx = posX + waveLen * Math.cos(rad);
      const by = posY + waveLen * Math.sin(rad);
      const headHalf = headSize * 0.45;
      const h1 = hAngle + Math.PI / 2;
      const h2 = hAngle - Math.PI / 2;
      headPath = `M ${(bx + headHalf * Math.cos(h1)).toFixed(1)} ${(by + headHalf * Math.sin(h1)).toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} L ${(bx + headHalf * Math.cos(h2)).toFixed(1)} ${(by + headHalf * Math.sin(h2)).toFixed(1)} Z`;
      headFill = color;
    } else {
      linePath = `M ${posX} ${posY} L ${ex} ${ey}`;
      strokeDash = ls === 'dashed' ? '8,6' : ls === 'dotted' ? '3,5' : undefined;
      const a1 = hAngle + Math.PI * 0.82;
      const a2 = hAngle - Math.PI * 0.82;
      headPath = `M ${ex} ${ey} L ${ex + headSize * Math.cos(a1)} ${ey + headSize * Math.sin(a1)} M ${ex} ${ey} L ${ex + headSize * Math.cos(a2)} ${ey + headSize * Math.sin(a2)}`;
    }
    // Label
    const labelX = ex + 8 * Math.cos(hAngle + Math.PI / 2);
    const labelY = ey + 8 * Math.sin(hAngle + Math.PI / 2);
    return (
      <>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path d={linePath} stroke={color} strokeWidth={sw} fill="none" strokeDasharray={strokeDash} strokeLinecap="round" />
          <Path d={headPath} stroke={color} strokeWidth={sw} fill={headFill} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        {element.label ? (
          <View style={[styles.arrowLabel, { position: 'absolute', left: labelX - 20, top: labelY - 18 }]}>
            <ThemedText style={[styles.arrowLabelText, { fontSize: Math.max(6, 10 * Math.max(0.6, ELEMENT_SIZE_RATIO * fieldW / 36)) }]}>{element.label}</ThemedText>
          </View>
        ) : null}
      </>
    );
  }

  if (element.type === 'drawing' && element.points && element.points.length >= 2) {
    const pts = element.points.map(p => ({
      x: normalized ? p.x * fieldW : p.x * (fieldW / 400),
      y: normalized ? p.y * fieldH : p.y * (fieldH / 310),
    }));
    const drawColor = element.color ?? '#FFFFFF';
    const sw = Math.max(1, 2 * Math.max(0.6, ELEMENT_SIZE_RATIO * fieldW / 36));
    // Catmull-Rom smoothing
    let d = `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) {
      d += ` L ${pts[1].x} ${pts[1].y}`;
    } else {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
    }
    return (
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={d} stroke={drawColor} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  const imgSource = FIELD_ELEMENT_IMAGES[element.type];
  const elScale = element.scale ?? 1;
  const scaledSize = size * elScale;
  const scaledIcon = iconSize * elScale;
  const flipX = element.flipX ? -1 : 1;

  return (
    <View style={[styles.staticElement, {
      left: posX, top: posY, width: scaledSize, height: scaledSize,
      transform: [{ rotate: `${element.rotation}deg` }, { scaleX: flipX }],
    }]}>
      {imgSource ? (
        <Image source={imgSource} style={{ width: scaledIcon, height: scaledIcon }} resizeMode="contain" />
      ) : (
        <Ionicons name={getElementIcon(element.type) as any} size={scaledIcon} color={color} />
      )}
      {element.label ? (
        <View style={[styles.labelBadge, { minWidth: Math.max(12, scaledSize * 0.5) }]}>
          <ThemedText style={[styles.labelText, { fontSize: Math.max(6, scaledSize * 0.28) }]}>{element.label}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function isNormalized(layout: FieldElement[]): boolean {
  return layout.every((el) => el.x <= 1 && el.y <= 1);
}

// ─── Fullscreen zoomable modal content ───
function ZoomableField({ layout, normalized, fieldW, fieldH, onClose }: {
  layout: FieldElement[]; normalized: boolean; fieldW: number; fieldH: number; onClose: () => void;
}) {
  const fieldRef = useRef<View>(null);
  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(fieldRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri);
    } catch (_) { /* user cancelled or error */ }
  }, []);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.min(5, Math.max(1, savedScale.value * e.scale)); })
    .onEnd(() => { savedScale.value = scale.value; if (scale.value < 1) { scale.value = withSpring(1); savedScale.value = 1; } });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      translateX.value = savedTX.value + e.translationX;
      translateY.value = savedTY.value + e.translationY;
    })
    .onEnd(() => { savedTX.value = translateX.value; savedTY.value = translateY.value; });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      savedScale.value = 1;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTX.value = 0;
      savedTY.value = 0;
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTap);

  const gesture = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <View style={styles.modalBackdrop}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width: fieldW, height: fieldH }, animStyle]}>
          <View ref={fieldRef} collapsable={false} style={[styles.modalField, { width: fieldW, height: fieldH }]}>
            <FieldSvg width={fieldW} height={fieldH} clipId="fullClip" />
            {layout.map((el, i) => (
              <StaticElement key={i} element={el} fieldW={fieldW} fieldH={fieldH} normalized={normalized} />
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
      <View style={styles.modalButtons}>
        <Pressable onPress={handleShare} style={styles.closeBtn}>
          <Ionicons name="share-outline" size={20} color="#FFF" />
        </Pressable>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

interface Props {
  layout: FieldElement[];
}

export function FieldPreview({ layout }: Props) {
  const normalized = isNormalized(layout);
  const colors = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const previewW = screenW - Spacing.four * 2;
  const previewH = previewW * HALF_FIELD_RATIO;

  // Fullscreen: use max available space, works in both portrait & landscape
  const fullMaxW = screenW * 0.95;
  const fullMaxH = screenH * 0.85;
  const fullW = Math.min(fullMaxW, fullMaxH / HALF_FIELD_RATIO);
  const fullH = fullW * HALF_FIELD_RATIO;

  useEffect(() => {
    if (open) {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [open]);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
        <View style={[styles.previewContainer, { width: previewW, height: previewH }]}>
          <FieldSvg width={previewW} height={previewH} clipId="prevClip" />
          {layout.map((el, i) => (
            <StaticElement key={i} element={el} fieldW={previewW} fieldH={previewH} normalized={normalized} />
          ))}
        </View>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent statusBarTranslucent supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}>
        <StatusBar hidden />
        <ZoomableField layout={layout} normalized={normalized} fieldW={fullW} fieldH={fullH} onClose={handleClose} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewContainer: { borderRadius: Radius.card, overflow: 'hidden' },
  staticElement: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  arrowWrap: { position: 'absolute', height: 24, justifyContent: 'center' },
  arrowLine: { borderRadius: 2 },
  arrowHead: { position: 'absolute', top: 4 },
  arrowLabel: {
    position: 'absolute', top: -14,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1,
  },
  arrowLabelText: { color: '#FFF', fontWeight: '700' },
  labelBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: { color: '#FFF', fontWeight: '700', textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalField: { borderRadius: 8, overflow: 'hidden' },
  modalButtons: {
    position: 'absolute', bottom: 40,
    flexDirection: 'row', gap: 16,
  },
  closeBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
});
