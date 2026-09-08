import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { FieldSvg } from '@/components/field-svg';
import { useTheme } from '@/hooks/use-theme';
import { useHistory } from '@/hooks/use-history';
import { haptic } from '@/hooks/use-haptic';
import { Spacing } from '@/constants/theme';
import {
  ELEMENT_SIZE_RATIO, PADDING, DEFAULT_ARROW_LEN, MIN_ARROW_LEN, MAX_ARROW_LEN,
  HALF_FIELD_RATIO, snapToGrid,
  getElementIcon, getElementColor, getDefaultScale,
  ALL_PALETTE_ITEMS,
} from '@/constants/field';
import { FIELD_ELEMENT_IMAGES } from '@/constants/field-images';
import type { FieldElement, ElementType } from '@/types/database';

const MIN_EL_SCALE = 0.4;
const MAX_EL_SCALE = 2.5;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const BOTTOM_BAR_H = 88;

const COLOR_PALETTE = [
  '#FF3B30', '#FF9500', '#FFD60A', '#30D158', '#5AC8FA',
  '#0A84FF', '#BF5AF2', '#FF375F', '#FFFFFF', '#8E8E93',
];
const LINE_STYLES: Array<'solid' | 'dashed' | 'dotted' | 'curved'> = ['solid', 'dashed', 'dotted', 'curved'];
const LINE_STYLE_ICONS: Record<string, string> = { solid: 'remove-outline', dashed: 'reorder-two-outline', dotted: 'ellipsis-horizontal-outline', curved: 'git-compare-outline' };

// ─── Elemento draggabile ───
function DraggableElement({
  element, index, selected, isGroupDrag, fieldW, fieldH, zoomRef, groupDragX, groupDragY, onTapSelect, onDragSelect, onMove,
}: {
  element: FieldElement; index: number; selected: boolean; isGroupDrag: boolean;
  fieldW: number; fieldH: number; zoomRef: React.MutableRefObject<number>;
  groupDragX: Animated.SharedValue<number>; groupDragY: Animated.SharedValue<number>;
  onTapSelect: (i: number) => void; onDragSelect: (i: number) => void; onMove: (i: number, x: number, y: number) => void;
}) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const elScale = element.scale ?? 1;
  const elFlip = element.flipX ? -1 : 1;
  const baseSize = fieldW * ELEMENT_SIZE_RATIO;
  const size = baseSize * elScale;
  const imgSize = baseSize * 0.88 * elScale;

  const pan = Gesture.Pan()
    .onBegin(() => { dragScale.value = withSpring(1.1); })
    .onStart(() => { isDragging.value = true; runOnJS(onDragSelect)(index); })
    .onUpdate((e) => {
      const z = zoomRef.current;
      const dx = e.translationX / z;
      const dy = e.translationY / z;
      offsetX.value = dx;
      offsetY.value = dy;
      if (isGroupDrag) { groupDragX.value = dx; groupDragY.value = dy; }
    })
    .onEnd((e) => {
      const z = zoomRef.current;
      const newX = snapToGrid(Math.max(0, Math.min(fieldW - size, element.x + e.translationX / z)));
      const newY = snapToGrid(Math.max(0, Math.min(fieldH - size, element.y + e.translationY / z)));
      offsetX.value = withSpring(newX - element.x);
      offsetY.value = withSpring(newY - element.y);
      dragScale.value = withSpring(1);
      isDragging.value = false;
      if (isGroupDrag) { groupDragX.value = 0; groupDragY.value = 0; }
      runOnJS(onMove)(index, newX, newY);
    })
    .onFinalize(() => { isDragging.value = false; });
  const tap = Gesture.Tap().onEnd(() => { runOnJS(onTapSelect)(index); });

  // Reset offset when element position changes (after onMove updates state)
  useEffect(() => { offsetX.value = 0; offsetY.value = 0; }, [element.x, element.y]);

  const animStyle = useAnimatedStyle(() => {
    const gx = (selected && !isDragging.value) ? groupDragX.value : 0;
    const gy = (selected && !isDragging.value) ? groupDragY.value : 0;
    return {
      width: size, height: size,
      left: element.x,
      top: element.y,
      transform: [
        { translateX: offsetX.value + gx }, { translateY: offsetY.value + gy },
        { rotate: `${element.rotation}deg` }, { scaleX: elFlip * dragScale.value }, { scaleY: dragScale.value },
      ],
    };
  });

  const color = element.color ?? getElementColor(element.type);
  const imgSource = FIELD_ELEMENT_IMAGES[element.type];

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View style={[styles.element, animStyle, selected && styles.elementSelected]}>
        {imgSource ? (
          <Image source={imgSource} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />
        ) : (
          <Ionicons name={getElementIcon(element.type) as any} size={Math.round(imgSize)} color={color} />
        )}
        {element.label ? (
          <View style={styles.elementLabel}>
            <ThemedText style={styles.elementLabelText}>{element.label}</ThemedText>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Catmull-Rom → SVG cubic bezier (smoothing per disegno libero) ───
function catmullRomToSvg(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
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
  return d;
}

// ─── Disegno libero draggabile ───
function DraggableDrawing({
  element, index, selected, isGroupDrag, fieldW, fieldH, zoomRef, groupDragX, groupDragY, onTapSelect, onDragSelect, onMove,
}: {
  element: FieldElement; index: number; selected: boolean; isGroupDrag: boolean;
  fieldW: number; fieldH: number; zoomRef: React.MutableRefObject<number>;
  groupDragX: Animated.SharedValue<number>; groupDragY: Animated.SharedValue<number>;
  onTapSelect: (i: number) => void; onDragSelect: (i: number) => void;
  onMove: (i: number, x: number, y: number) => void;
}) {
  const pts = element.points ?? [];
  if (pts.length < 2) return null;

  // Bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const pad = 10;
  const bx = minX - pad;
  const by = minY - pad;
  const bw = maxX - minX + pad * 2;
  const bh = maxY - minY + pad * 2;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  useEffect(() => { translateX.value = 0; translateY.value = 0; }, [element.x, element.y]);

  const pan = Gesture.Pan()
    .onStart(() => { isDragging.value = true; runOnJS(onDragSelect)(index); })
    .onUpdate((e) => {
      const z = zoomRef.current;
      const dx = e.translationX / z;
      const dy = e.translationY / z;
      translateX.value = dx;
      translateY.value = dy;
      if (isGroupDrag) { groupDragX.value = dx; groupDragY.value = dy; }
    })
    .onEnd((e) => {
      const z = zoomRef.current;
      const dx = e.translationX / z;
      const dy = e.translationY / z;
      translateX.value = withSpring(dx);
      translateY.value = withSpring(0);
      isDragging.value = false;
      if (isGroupDrag) { groupDragX.value = 0; groupDragY.value = 0; }
      runOnJS(onMove)(index, dx, dy);
    })
    .onFinalize(() => { isDragging.value = false; });

  const tap = Gesture.Tap().onEnd(() => { runOnJS(onTapSelect)(index); });

  const animStyle = useAnimatedStyle(() => {
    const gx = (selected && !isDragging.value) ? groupDragX.value : 0;
    const gy = (selected && !isDragging.value) ? groupDragY.value : 0;
    return {
      transform: [{ translateX: translateX.value + gx }, { translateY: translateY.value + gy }],
    };
  });

  const drawColor = element.color ?? '#FFFFFF';
  const svgPath = catmullRomToSvg(pts.map(p => ({ x: p.x - bx, y: p.y - by })));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View style={[{ position: 'absolute', left: bx, top: by, width: bw, height: bh }, animStyle, selected && styles.drawingSelected]}>
        <Svg width={bw} height={bh}>
          <Path d={svgPath} stroke={drawColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Genera path SVG sinusoidale per freccia curva + punta integrata ───
function buildWavePath(width: number, amplitude: number, periods: number): { wave: string; head: string } {
  // Punta: triangolo classico alla fine
  const headLen = 12;
  const headHalf = 5;
  const waveW = width - headLen;
  // Forza un numero intero di periodi così l'onda finisce a y=0
  const fullPeriods = Math.round(periods);
  const steps = Math.max(24, fullPeriods * 16);
  let wave = `M 0 0`;
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * waveW;
    const y = amplitude * Math.sin((i / steps) * fullPeriods * 2 * Math.PI);
    wave += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  // Triangolo pulito: base centrata sull'asse, punta alla fine
  const head = `M ${waveW.toFixed(1)} ${(-headHalf).toFixed(1)} L ${width.toFixed(1)} 0 L ${waveW.toFixed(1)} ${headHalf.toFixed(1)} Z`;
  return { wave, head };
}

// ─── Freccia draggabile ───
function DraggableArrow({
  element, index, selected, isGroupDrag, fieldW, fieldH, zoomRef, groupDragX, groupDragY, onTapSelect, onDragSelect, onMove, onResize,
}: {
  element: FieldElement; index: number; selected: boolean; isGroupDrag: boolean;
  fieldW: number; fieldH: number; zoomRef: React.MutableRefObject<number>;
  groupDragX: Animated.SharedValue<number>; groupDragY: Animated.SharedValue<number>;
  onTapSelect: (i: number) => void; onDragSelect: (i: number) => void;
  onMove: (i: number, x: number, y: number) => void;
  onResize: (i: number, length: number) => void;
}) {
  const arrowLen = element.length ?? DEFAULT_ARROW_LEN;
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const handleX = useSharedValue(arrowLen);

  useEffect(() => { offsetX.value = 0; offsetY.value = 0; handleX.value = arrowLen; }, [element.x, element.y, arrowLen]);

  const tapBody = Gesture.Tap().onEnd(() => { runOnJS(onTapSelect)(index); });

  const rad = (element.rotation * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  const isResizing = useSharedValue(false);
  const HANDLE_ZONE = 30;

  const panArrow = Gesture.Pan()
    .onBegin((e) => {
      if (selected && e.x > arrowLen - HANDLE_ZONE) {
        isResizing.value = true;
      } else {
        isResizing.value = false;
        dragScale.value = withSpring(1.05);
      }
    })
    .onStart(() => { isDragging.value = true; runOnJS(onDragSelect)(index); })
    .onUpdate((e) => {
      const z = zoomRef.current;
      if (isResizing.value) {
        const proj = (e.translationX * cosR + e.translationY * sinR) / z;
        handleX.value = Math.max(MIN_ARROW_LEN, Math.min(MAX_ARROW_LEN, arrowLen + proj));
      } else {
        const dx = e.translationX / z;
        const dy = e.translationY / z;
        offsetX.value = dx;
        offsetY.value = dy;
        if (isGroupDrag) { groupDragX.value = dx; groupDragY.value = dy; }
      }
    })
    .onEnd((e) => {
      const z = zoomRef.current;
      isDragging.value = false;
      if (isResizing.value) {
        const proj = (e.translationX * cosR + e.translationY * sinR) / z;
        const nl = Math.max(MIN_ARROW_LEN, Math.min(MAX_ARROW_LEN, arrowLen + proj));
        handleX.value = withSpring(nl);
        isResizing.value = false;
        runOnJS(onResize)(index, nl);
      } else {
        const newX = snapToGrid(Math.max(0, Math.min(fieldW - arrowLen, element.x + e.translationX / z)));
        const newY = snapToGrid(Math.max(-10, Math.min(fieldH - 10, element.y + e.translationY / z)));
        offsetX.value = withSpring(newX - element.x);
        offsetY.value = withSpring(newY - element.y);
        dragScale.value = withSpring(1);
        if (isGroupDrag) { groupDragX.value = 0; groupDragY.value = 0; }
        runOnJS(onMove)(index, newX, newY);
      }
    })
    .onFinalize(() => { isDragging.value = false; });

  const bodyStyle = useAnimatedStyle(() => {
    const gx = (selected && !isDragging.value) ? groupDragX.value : 0;
    const gy = (selected && !isDragging.value) ? groupDragY.value : 0;
    return {
      left: element.x,
      top: element.y,
      transform: [{ translateX: offsetX.value + gx }, { translateY: offsetY.value + gy }, { rotate: `${element.rotation}deg` }, { scale: dragScale.value }],
    };
  });
  const lineStyle = useAnimatedStyle(() => ({ width: handleX.value }));
  const hStyle = useAnimatedStyle(() => ({ transform: [{ translateX: handleX.value - 8 }] }));

  const arrowColor = element.color ?? '#5AC8FA';
  const ls = element.lineStyle ?? 'solid';

  return (
    <GestureDetector gesture={Gesture.Exclusive(panArrow, tapBody)}>
      <Animated.View style={[styles.arrowContainer, bodyStyle, selected && styles.arrowSelected]}>
        {ls === 'curved' ? (
          /* Onda sinusoidale SVG con punta integrata */
          <Animated.View style={[{ height: 24, overflow: 'visible' }, lineStyle]}>
            <Svg width={arrowLen} height={24} viewBox={`0 -12 ${arrowLen} 24`} style={{ overflow: 'visible' }}>
              {(() => { const wp = buildWavePath(arrowLen, 6, Math.max(2, arrowLen / 30)); return (
                <>
                  <Path d={wp.wave} stroke={arrowColor} strokeWidth={2} fill="none" strokeLinecap="round" />
                  <Path d={wp.head} stroke={arrowColor} strokeWidth={2} fill={arrowColor} strokeLinejoin="round" strokeLinecap="round" />
                </>
              ); })()}
            </Svg>
          </Animated.View>
        ) : (
          <>
            <Animated.View style={[{ height: 2, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }, lineStyle]}>
              {ls === 'solid' ? (
                <View style={{ flex: 1, height: 2, backgroundColor: arrowColor, borderRadius: 1 }} />
              ) : ls === 'dashed' ? (
                Array.from({ length: 30 }).map((_, i) => (
                  <View key={i} style={{ width: 8, height: 2, backgroundColor: i % 2 === 0 ? arrowColor : 'transparent', marginRight: 0 }} />
                ))
              ) : (
                Array.from({ length: 40 }).map((_, i) => (
                  <View key={i} style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: arrowColor, marginRight: 4 }} />
                ))
              )}
            </Animated.View>
            <Animated.View style={[styles.arrowHead, hStyle]}>
              <View style={[styles.arrowTriangle, { borderLeftColor: arrowColor }]} />
            </Animated.View>
          </>
        )}
        {element.label ? (
          <Animated.View style={[styles.arrowLabelWrap, hStyle]}>
            <ThemedText style={styles.arrowLabelText}>{element.label}</ThemedText>
          </Animated.View>
        ) : null}
        {selected && (
          <Animated.View style={[styles.arrowHandle, hStyle, { backgroundColor: '#6FC22C' }]} />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Floating toolbar sopra elemento selezionato ───
function FloatingToolbar({
  element, fieldW, fieldH, colors,
  onRotate, onScale, onFlip, onDuplicate, onDelete, onColor, onLineStyle, onLabel,
}: {
  element: FieldElement; fieldW: number; fieldH: number; colors: any;
  onRotate: (d: number) => void; onScale: (d: number) => void;
  onFlip: () => void; onDuplicate: () => void; onDelete: () => void;
  onColor: (c: string) => void; onLineStyle: () => void; onLabel: (l: string) => void;
}) {
  const [showColors, setShowColors] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const isArrow = element.type === 'arrow';
  const isDrawing = element.type === 'drawing';
  const elScale = element.scale ?? 1;

  // Drawing toolbar: solo colore + elimina
  if (isDrawing) {
    return (
      <View style={[styles.floatingToolbar, { top: 6, alignSelf: 'center', left: fieldW / 2 - 80 }]} pointerEvents="box-none">
        <View style={styles.floatingRow}>
          <Pressable onPress={() => setShowColors(!showColors)} style={[styles.fBtn, { backgroundColor: element.color ?? 'rgba(255,255,255,0.12)' }]}>
            <Ionicons name="color-palette-outline" size={14} color={element.color ? '#000' : '#FFF'} />
          </Pressable>
          <Pressable onPress={onDuplicate} style={styles.fBtn}>
            <Ionicons name="copy-outline" size={14} color="#FFF" />
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.fBtn, { backgroundColor: 'rgba(255,59,48,0.4)' }]}>
            <Ionicons name="trash-outline" size={14} color="#FF3B30" />
          </Pressable>
        </View>
        {showColors && (
          <View style={styles.floatingRow}>
            {COLOR_PALETTE.map((c) => (
              <Pressable key={c} onPress={() => { onColor(c); setShowColors(false); }}
                style={[styles.fColorDot, { backgroundColor: c }, element.color === c && styles.fColorSelected]} />
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.floatingToolbar, { top: 6, alignSelf: 'center', left: fieldW / 2 - 130 }]} pointerEvents="box-none">
      {/* Row 1: rotazione + scala */}
      <View style={styles.floatingRow}>
        <Pressable onPress={() => onRotate(-15)} onLongPress={() => onRotate(-45)} delayLongPress={300}
          style={styles.fBtn}><Ionicons name="return-up-back-outline" size={14} color="#FFF" /></Pressable>
        <ThemedText style={styles.fVal}>{element.rotation}°</ThemedText>
        <Pressable onPress={() => onRotate(15)} onLongPress={() => onRotate(45)} delayLongPress={300}
          style={styles.fBtn}><Ionicons name="return-up-forward-outline" size={14} color="#FFF" /></Pressable>

        {!isArrow && (
          <>
            <View style={styles.fDiv} />
            <Pressable onPress={() => onScale(-0.15)} style={styles.fBtn}>
              <Ionicons name="remove-outline" size={14} color="#FFF" />
            </Pressable>
            <ThemedText style={styles.fVal}>{(elScale * 100).toFixed(0)}%</ThemedText>
            <Pressable onPress={() => onScale(0.15)} style={styles.fBtn}>
              <Ionicons name="add-outline" size={14} color="#FFF" />
            </Pressable>
          </>
        )}

        {isArrow && (
          <>
            <View style={styles.fDiv} />
            <Pressable onPress={onLineStyle} style={styles.fBtn}>
              <Ionicons name={LINE_STYLE_ICONS[element.lineStyle ?? 'solid'] as any} size={14} color="#FFF" />
            </Pressable>
          </>
        )}
      </View>

      {/* Row 2: azioni */}
      <View style={styles.floatingRow}>
        {!isArrow && (
          <Pressable onPress={onFlip} style={[styles.fBtn, element.flipX && { backgroundColor: '#6FC22C' }]}>
            <Ionicons name="swap-horizontal-outline" size={14} color="#FFF" />
          </Pressable>
        )}
        {isArrow && (
          <>
            <Pressable onPress={() => setShowColors(!showColors)} style={[styles.fBtn, { backgroundColor: element.color ?? 'rgba(255,255,255,0.12)' }]}>
              <Ionicons name="color-palette-outline" size={14} color={element.color ? '#000' : '#FFF'} />
            </Pressable>
            <Pressable onPress={() => setShowLabel(!showLabel)} style={[styles.fBtn, element.label ? { backgroundColor: '#6FC22C' } : undefined]}>
              <Ionicons name="text-outline" size={14} color="#FFF" />
            </Pressable>
          </>
        )}
        <Pressable onPress={onDuplicate} style={styles.fBtn}>
          <Ionicons name="copy-outline" size={14} color="#FFF" />
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.fBtn, { backgroundColor: 'rgba(255,59,48,0.4)' }]}>
          <Ionicons name="trash-outline" size={14} color="#FF3B30" />
        </Pressable>
      </View>

      {/* Color picker row — solo frecce */}
      {isArrow && showColors && (
        <View style={styles.floatingRow}>
          {COLOR_PALETTE.map((c) => (
            <Pressable key={c} onPress={() => { onColor(c); setShowColors(false); }}
              style={[styles.fColorDot, { backgroundColor: c }, element.color === c && styles.fColorSelected]} />
          ))}
        </View>
      )}

      {/* Label input — solo frecce */}
      {isArrow && showLabel && (
        <View style={styles.floatingRow}>
          <TextInput
            style={styles.fLabelInput}
            value={element.label ?? ''}
            onChangeText={onLabel}
            placeholder="corsa, pass..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            maxLength={10}
            autoFocus
          />
        </View>
      )}
    </View>
  );
}

// ─── Prompt rotazione telefono ───
function RotatePrompt() {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={styles.rotateContainer}>
      <Ionicons name="phone-landscape-outline" size={64} color={colors.accent} />
      <ThemedText type="title" style={styles.rotateTitle}>{t('builder.rotateTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rotateSubtitle}>{t('builder.rotateSubtitle')}</ThemedText>
    </View>
  );
}

// ─── Builder principale ───
interface Props { initialLayout?: FieldElement[]; onDone: (layout: FieldElement[]) => void; }

export function FieldBuilder({ initialLayout, onDone }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = screenW > screenH;

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); };
  }, []);

  const { state: elements, set: setElements, undo, redo, canUndo, canRedo, reset: resetElements } = useHistory<FieldElement[]>([]);
  const userEditedRef = useRef(false);
  const lastDenormFW = useRef(0);
  const [denormKey, setDenormKey] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [multiMode, setMultiMode] = useState(false);
  const multiModeRef = useRef(false);
  const [showPalette, setShowPalette] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const drawModeRef = useRef(false);
  const drawPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [liveStroke, setLiveStroke] = useState<{ x: number; y: number }[] | null>(null);

  const selectedIndex = selectedIndices.size === 1 ? [...selectedIndices][0] : null;
  // Tap: toggle in multi-mode, single-select otherwise
  const tapSelect = useCallback((i: number) => {
    if (multiModeRef.current) {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i); else next.add(i);
        return next;
      });
    } else {
      setSelectedIndices(new Set([i]));
    }
  }, []);
  // Drag start: ensure selected (never toggle off)
  const dragSelect = useCallback((i: number) => {
    if (multiModeRef.current) {
      setSelectedIndices((prev) => {
        if (prev.has(i)) return prev;
        const next = new Set(prev);
        next.add(i);
        return next;
      });
    } else {
      setSelectedIndices(new Set([i]));
    }
  }, []);
  const clearSelection = useCallback(() => { setSelectedIndices(new Set()); }, []);
  // Group drag offset (shared across all selected elements)
  const groupDragX = useSharedValue(0);
  const groupDragY = useSharedValue(0);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);

  // Zoom
  const zoomRef = useRef(1);
  const zoomScale = useSharedValue(1);
  const zoomTransX = useSharedValue(0);
  const zoomTransY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTransX = useSharedValue(0);
  const savedTransY = useSharedValue(0);
  const [zoomDisplay, setZoomDisplay] = useState(1);
  const updateZoomRef = useCallback((v: number) => { zoomRef.current = v; setZoomDisplay(v); }, []);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  }, []);

  const safeLeft = Math.max(insets.left, PADDING);
  const safeRight = Math.max(insets.right, PADDING);
  const cW = containerSize?.w ?? (screenW - safeLeft - safeRight);
  const cH = containerSize?.h ?? screenH;

  // Field fills space maintaining image aspect ratio
  const fWFromH = cH / HALF_FIELD_RATIO;
  const fHFromW = cW * HALF_FIELD_RATIO;
  const fW = fWFromH <= cW ? fWFromH : cW;
  const fH = fWFromH <= cW ? cH : fHFromW;

  // Denormalize initial layout once (coordinates 0-1 → pixel)
  // Must wait for landscape AND containerSize so fW/fH are final
  useEffect(() => {
    if (userEditedRef.current || !isLandscape || !containerSize || fW < 10) return;
    if (!initialLayout?.length) return;
    // Skip if fW hasn't changed (avoid unnecessary resets)
    if (lastDenormFW.current === fW) return;
    lastDenormFW.current = fW;
    // Check if normalized: all x/y ≤ 1.05 (small tolerance for float rounding)
    const maxX = Math.max(...initialLayout.map(el => el.x));
    const maxY = Math.max(...initialLayout.map(el => el.y));
    const isNorm = maxX <= 1.05 && maxY <= 1.05;
    if (!isNorm) {
      resetElements(initialLayout);
      setDenormKey(k => k + 1);
      return;
    }
    const denorm = initialLayout.map(el => ({
      ...el,
      x: el.x * fW,
      y: el.y * fH,
      ...(el.length != null ? { length: el.length * fW } : {}),
      ...(el.points ? { points: el.points.map(p => ({ x: p.x * fW, y: p.y * fH })) } : {}),
    }));
    resetElements(denorm);
    setDenormKey(k => k + 1);
  }, [fW, fH, isLandscape, containerSize, initialLayout, resetElements]);

  // Zoom gestures
  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = zoomScale.value; })
    .onUpdate((e) => { zoomScale.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, savedScale.value * e.scale)); })
    .onEnd(() => { runOnJS(updateZoomRef)(zoomScale.value); });
  const panZoom = Gesture.Pan().minPointers(2)
    .onStart(() => { savedTransX.value = zoomTransX.value; savedTransY.value = zoomTransY.value; })
    .onUpdate((e) => { zoomTransX.value = savedTransX.value + e.translationX; zoomTransY.value = savedTransY.value + e.translationY; });
  const dblTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    zoomScale.value = withTiming(1, { duration: 200 }); zoomTransX.value = withTiming(0, { duration: 200 }); zoomTransY.value = withTiming(0, { duration: 200 });
    runOnJS(updateZoomRef)(1);
  });
  // Drawing gesture: single-finger pan captures points when drawMode active
  const addDrawPoint = useCallback((x: number, y: number) => {
    drawPointsRef.current.push({ x, y });
    // Update live preview every 3 points
    if (drawPointsRef.current.length % 3 === 0) {
      setLiveStroke([...drawPointsRef.current]);
    }
  }, []);
  const startDraw = useCallback((x: number, y: number) => {
    drawPointsRef.current = [{ x, y }];
    setLiveStroke([{ x, y }]);
  }, []);
  const endDraw = useCallback(() => {
    finishDrawing(drawPointsRef.current);
    drawPointsRef.current = [];
  }, [finishDrawing]);

  const panDraw = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .enabled(drawMode)
    .onStart((e) => { runOnJS(startDraw)(e.x, e.y); })
    .onUpdate((e) => { runOnJS(addDrawPoint)(e.x, e.y); })
    .onEnd(() => { runOnJS(endDraw)(); });

  const zoomGesture = Gesture.Race(dblTap, Gesture.Simultaneous(pinch, panZoom));
  const fieldGesture = drawMode ? Gesture.Exclusive(panDraw, zoomGesture) : zoomGesture;
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: zoomTransX.value }, { translateY: zoomTransY.value }, { scale: zoomScale.value }],
  }));

  // ─── Azioni ───
  const markEdited = useCallback(() => { userEditedRef.current = true; }, []);
  const addElement = useCallback((type: ElementType) => {
    markEdited();
    haptic('light');
    const elSize = fW * ELEMENT_SIZE_RATIO;
    const cx = snapToGrid(fW / 2 - elSize / 2);
    const cy = snapToGrid(fH / 2 - elSize / 2);
    const defScale = getDefaultScale(type);
    const base: FieldElement = { type, x: cx, y: cy, rotation: 0, ...(defScale !== 1 && { scale: defScale }) };
    setElements([...elements, type === 'arrow' ? { ...base, length: DEFAULT_ARROW_LEN } : base]);
    clearSelection();
    setShowPalette(false);
  }, [fW, fH, elements, setElements, clearSelection]);

  const moveElement = useCallback((i: number, x: number, y: number) => {
    markEdited();
    if (selectedIndices.size > 1 && selectedIndices.has(i)) {
      // Move group: compute delta from this element's old position
      const dx = x - elements[i].x;
      const dy = y - elements[i].y;
      setElements(elements.map((el, j) => selectedIndices.has(j) ? { ...el, x: snapToGrid(el.x + dx), y: snapToGrid(el.y + dy) } : el));
    } else {
      setElements(elements.map((el, j) => (j === i ? { ...el, x, y } : el)));
    }
  }, [elements, setElements, selectedIndices]);

  const resizeArrow = useCallback((i: number, length: number) => {
    setElements(elements.map((el, j) => (j === i ? { ...el, length } : el)));
  }, [elements, setElements]);

  // Move drawing: translate all points by delta
  const moveDrawing = useCallback((i: number, dx: number, dy: number) => {
    markEdited();
    setElements(elements.map((el, j) => {
      if (j !== i || !el.points) return el;
      return { ...el, x: el.x + dx, y: el.y + dy, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
    }));
  }, [elements, setElements]);

  // Finish drawing: add collected points as new drawing element
  const finishDrawing = useCallback((pts: { x: number; y: number }[]) => {
    setLiveStroke(null);
    if (pts.length < 3) return;
    const step = Math.max(1, Math.floor(pts.length / 60));
    const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
    if (sampled.length < 2) return;
    const el: FieldElement = {
      type: 'drawing', x: sampled[0].x, y: sampled[0].y, rotation: 0,
      color: drawColor, points: sampled,
    };
    setElements(prev => [...prev, el]);
    haptic('light');
  }, [setElements, drawColor]);

  const rotateSelected = useCallback((delta: number) => {
    if (selectedIndices.size === 0) return; haptic('light');
    setElements(elements.map((el, i) => selectedIndices.has(i) ? { ...el, rotation: (el.rotation + delta + 360) % 360 } : el));
  }, [selectedIndices, elements, setElements]);

  const scaleSelected = useCallback((delta: number) => {
    if (selectedIndices.size === 0) return; haptic('light');
    setElements(elements.map((el, i) => {
      if (!selectedIndices.has(i)) return el;
      const cur = el.scale ?? 1;
      return { ...el, scale: Math.max(MIN_EL_SCALE, Math.min(MAX_EL_SCALE, +(cur + delta).toFixed(2))) };
    }));
  }, [selectedIndices, elements, setElements]);

  const flipSelected = useCallback(() => {
    if (selectedIndices.size === 0) return; haptic('light');
    setElements(elements.map((el, i) => selectedIndices.has(i) ? { ...el, flipX: !el.flipX } : el));
  }, [selectedIndices, elements, setElements]);

  const setColor = useCallback((color: string) => {
    if (selectedIndices.size === 0) return; haptic('light');
    setElements(elements.map((el, i) => selectedIndices.has(i) ? { ...el, color } : el));
  }, [selectedIndices, elements, setElements]);

  const toggleLineStyle = useCallback(() => {
    if (selectedIndex == null) return; haptic('light');
    const cur = elements[selectedIndex].lineStyle ?? 'solid';
    const nextIdx = (LINE_STYLES.indexOf(cur) + 1) % LINE_STYLES.length;
    setElements(elements.map((el, i) => i === selectedIndex ? { ...el, lineStyle: LINE_STYLES[nextIdx] } : el));
  }, [selectedIndex, elements, setElements]);

  const setLabel = useCallback((label: string) => {
    if (selectedIndex == null) return;
    setElements(elements.map((el, i) => i === selectedIndex ? { ...el, label: label || undefined } : el));
  }, [selectedIndex, elements, setElements]);

  const deleteSelected = useCallback(() => {
    if (selectedIndices.size === 0) return; markEdited(); haptic('light');
    setElements(elements.filter((_, i) => !selectedIndices.has(i)));
    clearSelection();
  }, [selectedIndices, elements, setElements, clearSelection]);

  const duplicateSelected = useCallback(() => {
    if (selectedIndices.size === 0) return; haptic('light');
    const dupes = [...selectedIndices].map((i) => elements[i]).map((el) => ({ ...el, x: snapToGrid(el.x + 20), y: snapToGrid(el.y + 20) }));
    const newStart = elements.length;
    setElements([...elements, ...dupes]);
    setSelectedIndices(new Set(dupes.map((_, j) => newStart + j)));
  }, [selectedIndices, elements, setElements]);

  const handleUndo = useCallback(() => { haptic('light'); undo(); clearSelection(); }, [undo, clearSelection]);
  const handleRedo = useCallback(() => { haptic('light'); redo(); clearSelection(); }, [redo, clearSelection]);

  const handleDone = useCallback(async () => {
    haptic('medium');
    const norm = elements.map((el) => ({
      ...el, x: el.x / fW, y: el.y / fH,
      ...(el.length != null ? { length: el.length / fW } : {}),
      ...(el.points ? { points: el.points.map(p => ({ x: p.x / fW, y: p.y / fH })) } : {}),
    }));
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    onDone(norm);
  }, [elements, fW, fH, onDone]);

  if (!isLandscape) return <RotatePrompt />;

  const selectedEl = selectedIndex != null ? elements[selectedIndex] : null;
  // For multi-selection toolbar, use the first selected element as reference
  const multiEl = selectedIndices.size > 1 ? elements[[...selectedIndices][0]] : null;

  return (
    <View style={styles.root} onLayout={onContainerLayout}>
      {/* ─── Campo (centrato, aspect ratio corretto) ─── */}
      <View style={[styles.fieldClip, { width: fW, height: fH, alignSelf: 'center' }]}>
        <GestureDetector gesture={fieldGesture}>
          <Animated.View style={[{ width: fW, height: fH }, zoomStyle]}>
            <Pressable onPress={clearSelection} style={{ width: fW, height: fH }}>
              <FieldSvg width={fW} height={fH} clipId="builderClip" />
            </Pressable>
            {elements.map((el, i) =>
              el.type === 'arrow' ? (
                <DraggableArrow key={`${i}-${denormKey}`} element={el} index={i} selected={selectedIndices.has(i)}
                  isGroupDrag={selectedIndices.size > 1 && selectedIndices.has(i)}
                  fieldW={fW} fieldH={fH} zoomRef={zoomRef} groupDragX={groupDragX} groupDragY={groupDragY}
                  onTapSelect={tapSelect} onDragSelect={dragSelect} onMove={moveElement} onResize={resizeArrow} />
              ) : el.type === 'drawing' ? (
                <DraggableDrawing key={`${i}-${denormKey}`} element={el} index={i} selected={selectedIndices.has(i)}
                  isGroupDrag={selectedIndices.size > 1 && selectedIndices.has(i)}
                  fieldW={fW} fieldH={fH} zoomRef={zoomRef} groupDragX={groupDragX} groupDragY={groupDragY}
                  onTapSelect={tapSelect} onDragSelect={dragSelect} onMove={moveDrawing} />
              ) : (
                <DraggableElement key={`${i}-${denormKey}`} element={el} index={i} selected={selectedIndices.has(i)}
                  isGroupDrag={selectedIndices.size > 1 && selectedIndices.has(i)}
                  fieldW={fW} fieldH={fH} zoomRef={zoomRef} groupDragX={groupDragX} groupDragY={groupDragY}
                  onTapSelect={tapSelect} onDragSelect={dragSelect} onMove={moveElement} />
              ),
            )}
            {/* Live drawing stroke */}
            {liveStroke && liveStroke.length >= 2 && (
              <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                <Path d={catmullRomToSvg(liveStroke)} stroke={drawColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
            {/* Single selection: full toolbar */}
            {selectedEl && !multiEl && (
              <FloatingToolbar element={selectedEl} fieldW={fW} fieldH={fH} colors={colors}
                onRotate={rotateSelected} onScale={scaleSelected}
                onFlip={flipSelected} onDuplicate={duplicateSelected} onDelete={deleteSelected}
                onColor={setColor} onLineStyle={toggleLineStyle} onLabel={setLabel} />
            )}
            {/* Multi selection: compact toolbar */}
            {multiEl && (() => {
              // Distance between 2 selected elements (in real meters)
              let distLabel: string | null = null;
              if (selectedIndices.size === 2) {
                const [iA, iB] = [...selectedIndices];
                const a = elements[iA];
                const b = elements[iB];
                const FIELD_W_M = 52.5; // half-field width in meters
                const FIELD_H_M = 34;   // half-field depth in meters
                const dx = ((a.x - b.x) / fW) * FIELD_W_M;
                const dy = ((a.y - b.y) / fH) * FIELD_H_M;
                const dist = Math.sqrt(dx * dx + dy * dy);
                distLabel = `📏 ${dist.toFixed(1)}m`;
              }
              return (
                <View style={[styles.floatingToolbar, { top: 6, alignSelf: 'center', left: fW / 2 - 110 }]} pointerEvents="box-none">
                  <View style={styles.floatingRow}>
                    <ThemedText style={styles.fVal}>{selectedIndices.size} sel.</ThemedText>
                    {distLabel && (
                      <>
                        <View style={styles.fDiv} />
                        <ThemedText style={[styles.fVal, { color: '#FFD60A', minWidth: 50 }]}>{distLabel}</ThemedText>
                      </>
                    )}
                    <View style={styles.fDiv} />
                    <Pressable onPress={() => rotateSelected(-15)} onLongPress={() => rotateSelected(-45)} delayLongPress={300}
                      style={styles.fBtn}><Ionicons name="return-up-back-outline" size={14} color="#FFF" /></Pressable>
                    <Pressable onPress={() => rotateSelected(15)} onLongPress={() => rotateSelected(45)} delayLongPress={300}
                      style={styles.fBtn}><Ionicons name="return-up-forward-outline" size={14} color="#FFF" /></Pressable>
                    <View style={styles.fDiv} />
                    <Pressable onPress={duplicateSelected} style={styles.fBtn}>
                      <Ionicons name="copy-outline" size={14} color="#FFF" />
                    </Pressable>
                    <Pressable onPress={deleteSelected} style={[styles.fBtn, { backgroundColor: 'rgba(255,59,48,0.4)' }]}>
                      <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                    </Pressable>
                  </View>
                </View>
              );
            })()}
          </Animated.View>
        </GestureDetector>

        {/* Zoom badge */}
        {zoomDisplay > 1.05 && (
          <View style={styles.zoomBadge} pointerEvents="none">
            <ThemedText style={styles.zoomBadgeText}>{zoomDisplay.toFixed(1)}x</ThemedText>
          </View>
        )}

        {/* ─── Overlay bottom bar ─── */}
        {showPalette ? (
          /* Palette aperta: barra con elementi scrollabili */
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
            <Pressable onPress={() => setShowPalette(false)} style={styles.bbIconBtn}>
              <Ionicons name="close" size={20} color="#FFF" />
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bbScrollContent} style={styles.bbScroll}>
              {ALL_PALETTE_ITEMS.map((item) => (
                <Pressable key={item.type} onPress={() => addElement(item.type)}
                  style={({ pressed }) => [styles.bbItem, pressed && { opacity: 0.6 }]}>
                  <View style={styles.bbItemIcon}>
                    {FIELD_ELEMENT_IMAGES[item.type] ? (
                      <Image source={FIELD_ELEMENT_IMAGES[item.type]!} style={styles.bbItemImage} resizeMode="contain" />
                    ) : (
                      <Ionicons name={getElementIcon(item.type) as any} size={22} color={getElementColor(item.type)} />
                    )}
                  </View>
                  <ThemedText style={styles.bbItemLabel} numberOfLines={1}>
                    {t(item.labelKey)}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : (
          /* Palette chiusa: mini toolbar con +, undo/redo, done */
          <View style={[styles.miniBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
            <Pressable onPress={() => { setShowPalette(true); clearSelection(); }}
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}>
              <Ionicons name="add" size={26} color="#FFF" />
            </Pressable>
            <Pressable onPress={() => {
                const next = !multiMode;
                setMultiMode(next);
                multiModeRef.current = next;
                if (!next) clearSelection();
                if (next) { setDrawMode(false); drawModeRef.current = false; }
              }}
              style={[styles.bbIconBtn, multiMode && { backgroundColor: '#6FC22C' }]}>
              <Ionicons name="layers-outline" size={18} color="#FFF" />
            </Pressable>
            <Pressable onPress={() => {
                const next = !drawMode;
                setDrawMode(next);
                drawModeRef.current = next;
                clearSelection();
                if (next) { setMultiMode(false); multiModeRef.current = false; }
              }}
              style={[styles.bbIconBtn, drawMode && { backgroundColor: '#BF5AF2' }]}>
              <Ionicons name="pencil-outline" size={18} color="#FFF" />
            </Pressable>
            <Pressable onPress={handleUndo} disabled={!canUndo}
              style={[styles.bbIconBtn, { opacity: canUndo ? 1 : 0.3 }]}>
              <Ionicons name="arrow-undo-outline" size={18} color="#FFF" />
            </Pressable>
            <Pressable onPress={handleRedo} disabled={!canRedo}
              style={[styles.bbIconBtn, { opacity: canRedo ? 1 : 0.3 }]}>
              <Ionicons name="arrow-redo-outline" size={18} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={handleDone}
              style={({ pressed }) => [styles.bbDoneBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}>
              <Ionicons name="checkmark" size={22} color={colors.accentText} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  rotateTitle: { textAlign: 'center', fontSize: 20 },
  rotateSubtitle: { textAlign: 'center', lineHeight: 20 },

  root: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  fieldClip: { overflow: 'hidden' },

  zoomBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  zoomBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Disegni
  drawingSelected: {
    backgroundColor: 'rgba(191,90,242,0.15)', borderWidth: 1, borderColor: '#BF5AF2', borderRadius: 6,
  },

  // Elementi
  element: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  elementSelected: {
    backgroundColor: 'rgba(111,194,44,0.25)', borderWidth: 2, borderColor: '#6FC22C', borderRadius: 20,
  },
  elementLabel: {
    position: 'absolute', bottom: -10, backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1,
  },
  elementLabelText: { color: '#FFF', fontSize: 8, fontWeight: '700' },

  // Frecce
  arrowContainer: { position: 'absolute', height: 24, justifyContent: 'center' },
  arrowSelected: { backgroundColor: 'rgba(111,194,44,0.2)', borderRadius: 6, borderWidth: 1, borderColor: '#6FC22C', paddingHorizontal: 4 },
  arrowLine: {},
  arrowHead: { position: 'absolute', top: 4 },
  arrowTriangle: { width: 0, height: 0, borderTopWidth: 6, borderBottomWidth: 6, borderLeftWidth: 10, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  arrowHandle: { position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8 },
  arrowDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF', zIndex: 50 },
  arrowLabelWrap: {
    position: 'absolute', top: -18,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  arrowLabelText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Floating toolbar
  floatingToolbar: {
    position: 'absolute', zIndex: 100,
    backgroundColor: 'rgba(25,25,25,0.93)', borderRadius: 12, padding: 6, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  floatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fBtn: {
    width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  fVal: { color: '#FFF', fontSize: 10, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  fDiv: { width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 2 },
  fColorDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  fColorSelected: { borderColor: '#FFF', borderWidth: 2.5 },
  fLabelInput: {
    flex: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6,
    color: '#FFF', fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8, paddingVertical: 0,
  },

  // Mini bar (palette chiusa)
  miniBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingTop: 8,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },

  // Bottom bar (palette aperta)
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  bbActions: { flexDirection: 'column', gap: 4 },
  bbIconBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bbScroll: { flex: 1 },
  bbScrollContent: { gap: 10, alignItems: 'center', paddingHorizontal: 4 },
  bbItem: { alignItems: 'center', width: 56 },
  bbItemIcon: {
    width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bbItemImage: { width: 32, height: 32 },
  bbItemLabel: { fontSize: 8, marginTop: 2, textAlign: 'center', color: '#FFF' },
  bbDoneBtn: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
  },
});
