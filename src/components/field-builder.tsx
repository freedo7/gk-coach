import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutChangeEvent, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import Svg, { Defs, ClipPath, Rect, Circle, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { Radius, Spacing } from '@/constants/theme';
import type { FieldElement } from '@/types/database';

const ELEMENT_SIZE = 36;
const PADDING = 12;
const DEFAULT_ARROW_LEN = 80;
const MIN_ARROW_LEN = 30;
const MAX_ARROW_LEN = 250;
const SNAP_GRID = 10; // snap ogni 10px

// Proporzioni reali FIFA: campo 105×68m, mezzo campo 52.5×68m
// Ratio altezza/larghezza = 52.5/68 = 0.772
const HALF_FIELD_RATIO = 52.5 / 68;

type ElementType = FieldElement['type'];

interface PaletteItem {
  type: ElementType;
  icon: string;
  labelKey: string;
}

const PALETTE: PaletteItem[] = [
  { type: 'cone', icon: 'triangle-outline', labelKey: 'builder.cone' },
  { type: 'mannequin', icon: 'person-outline', labelKey: 'builder.mannequin' },
  { type: 'ball', icon: 'football-outline', labelKey: 'builder.ball' },
  { type: 'goalkeeper', icon: 'body-outline', labelKey: 'builder.goalkeeper' },
  { type: 'goal', icon: 'browsers-outline', labelKey: 'builder.goal' },
  { type: 'cube', icon: 'cube-outline', labelKey: 'builder.cube' },
  { type: 'arrow', icon: 'arrow-forward-outline', labelKey: 'builder.arrow' },
];

function getElementIcon(type: ElementType): string {
  return PALETTE.find((p) => p.type === type)?.icon ?? 'help-outline';
}

function getElementColor(type: ElementType): string {
  switch (type) {
    case 'cone': return '#FF9500';
    case 'mannequin': return '#AF52DE';
    case 'ball': return '#FFFFFF';
    case 'goalkeeper': return '#30D158';
    case 'goal': return '#FFFFFF';
    case 'cube': return '#FF3B30';
    case 'arrow': return '#5AC8FA';
    default: return '#FFFFFF';
  }
}

function snapToGrid(val: number): number {
  'worklet';
  return Math.round(val / SNAP_GRID) * SNAP_GRID;
}

// Elemento icona draggabile (senza sfondo cerchio)
function DraggableElement({
  element,
  index,
  selected,
  fieldW,
  fieldH,
  onSelect,
  onMove,
}: {
  element: FieldElement;
  index: number;
  selected: boolean;
  fieldW: number;
  fieldH: number;
  onSelect: (i: number) => void;
  onMove: (i: number, x: number, y: number) => void;
}) {
  const translateX = useSharedValue(element.x);
  const translateY = useSharedValue(element.y);
  const scale = useSharedValue(1);

  const pan = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.15);
      runOnJS(onSelect)(index);
    })
    .onUpdate((e) => {
      translateX.value = element.x + e.translationX;
      translateY.value = element.y + e.translationY;
    })
    .onEnd((e) => {
      const rawX = Math.max(0, Math.min(fieldW - ELEMENT_SIZE, element.x + e.translationX));
      const rawY = Math.max(0, Math.min(fieldH - ELEMENT_SIZE, element.y + e.translationY));
      const newX = snapToGrid(rawX);
      const newY = snapToGrid(rawY);
      translateX.value = withSpring(newX);
      translateY.value = withSpring(newY);
      scale.value = withSpring(1);
      runOnJS(onMove)(index, newX, newY);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)(index);
  });

  const composed = Gesture.Exclusive(pan, tap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.element, animStyle, selected && styles.elementSelectedRing]}>
        <Ionicons
          name={getElementIcon(element.type) as any}
          size={28}
          color={getElementColor(element.type)}
          style={selected ? styles.elementSelectedIcon : undefined}
        />
      </Animated.View>
    </GestureDetector>
  );
}

// Freccia draggabile con handle per la lunghezza
function DraggableArrow({
  element,
  index,
  selected,
  fieldW,
  fieldH,
  onSelect,
  onMove,
  onResize,
}: {
  element: FieldElement;
  index: number;
  selected: boolean;
  fieldW: number;
  fieldH: number;
  onSelect: (i: number) => void;
  onMove: (i: number, x: number, y: number) => void;
  onResize: (i: number, length: number) => void;
}) {
  const arrowLen = element.length ?? DEFAULT_ARROW_LEN;
  const translateX = useSharedValue(element.x);
  const translateY = useSharedValue(element.y);
  const scale = useSharedValue(1);
  const handleX = useSharedValue(arrowLen);

  // Drag corpo freccia
  const panBody = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.05);
      runOnJS(onSelect)(index);
    })
    .onUpdate((e) => {
      translateX.value = element.x + e.translationX;
      translateY.value = element.y + e.translationY;
    })
    .onEnd((e) => {
      const rawX = Math.max(0, Math.min(fieldW - arrowLen, element.x + e.translationX));
      const rawY = Math.max(-10, Math.min(fieldH - 10, element.y + e.translationY));
      const newX = snapToGrid(rawX);
      const newY = snapToGrid(rawY);
      translateX.value = withSpring(newX);
      translateY.value = withSpring(newY);
      scale.value = withSpring(1);
      runOnJS(onMove)(index, newX, newY);
    });

  const tapBody = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)(index);
  });

  const bodyGesture = Gesture.Exclusive(panBody, tapBody);

  // Drag handle punta (ridimensiona)
  const panHandle = Gesture.Pan()
    .onUpdate((e) => {
      const newLen = Math.max(MIN_ARROW_LEN, Math.min(MAX_ARROW_LEN, arrowLen + e.translationX));
      handleX.value = newLen;
    })
    .onEnd((e) => {
      const newLen = Math.max(MIN_ARROW_LEN, Math.min(MAX_ARROW_LEN, arrowLen + e.translationX));
      handleX.value = withSpring(newLen);
      runOnJS(onResize)(index, newLen);
    });

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: handleX.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: handleX.value - 8 }],
  }));

  return (
    <GestureDetector gesture={bodyGesture}>
      <Animated.View style={[styles.arrowContainer, bodyStyle, selected && styles.arrowSelected]}>
        {/* Linea freccia */}
        <Animated.View style={[styles.arrowLine, lineStyle, { backgroundColor: '#5AC8FA' }]} />
        {/* Punta */}
        <Animated.View style={[styles.arrowHead, handleStyle]}>
          <View style={[styles.arrowTriangle, { borderLeftColor: '#5AC8FA' }]} />
        </Animated.View>
        {/* Handle resize (solo se selezionata) */}
        {selected && (
          <GestureDetector gesture={panHandle}>
            <Animated.View style={[styles.arrowHandle, handleStyle, { backgroundColor: '#6FC22C' }]} />
          </GestureDetector>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// Campo SVG — mezzo campo con proporzioni FIFA reali
function FieldSvg({ width: W, height: H }: { width: number; height: number }) {
  const B = 6; // bordo
  const LW = 2; // spessore linee
  const LC = 'rgba(255,255,255,0.9)';
  const STRIPES = 10;
  const SH = H / STRIPES;

  // Proporzioni reali (rapportate a larghezza e altezza del campo)
  // Area di rigore: 40.32m × 16.5m → su campo 68m × 52.5m
  const penW = W * (40.32 / 68);
  const penH = H * (16.5 / 52.5);
  const penX = (W - penW) / 2;

  // Area piccola: 18.32m × 5.5m
  const goalAreaW = W * (18.32 / 68);
  const goalAreaH = H * (5.5 / 52.5);
  const goalAreaX = (W - goalAreaW) / 2;

  // Porta: 7.32m × 2.44m (profondità ~2m visiva)
  const goalW = W * (7.32 / 68);
  const goalH = Math.max(H * (2 / 52.5), 6);
  const goalX = (W - goalW) / 2;

  // Punto di rigore: 11m dalla linea di porta
  const penSpotY = H * (11 / 52.5);

  // Lunetta: arco di cerchio r=9.15m dal punto di rigore, solo parte fuori dall'area
  const arcR = W * (9.15 / 68);

  // Semicerchio centrocampo: r=9.15m
  const centerR = W * (9.15 / 68);

  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      <Defs>
        <ClipPath id="fieldClip">
          <Rect x={0} y={0} width={W} height={H} rx={6} />
        </ClipPath>
      </Defs>

      {/* Sfondo base */}
      <Rect x={0} y={0} width={W} height={H} fill="#3a8c3f" rx={6} />

      {/* Strisce erba */}
      {Array.from({ length: STRIPES }).map((_, i) => (
        i % 2 === 0 ? (
          <Rect key={i} x={0} y={i * SH} width={W} height={SH} fill="#439648" clipPath="url(#fieldClip)" />
        ) : null
      ))}

      {/* Bordo campo */}
      <Rect x={B} y={B} width={W - B * 2} height={H - B * 2} fill="none" stroke={LC} strokeWidth={LW} />

      {/* Porta */}
      <Rect x={goalX} y={B - goalH} width={goalW} height={goalH} fill="none" stroke={LC} strokeWidth={LW} clipPath="url(#fieldClip)" />

      {/* Area piccola */}
      <Rect x={goalAreaX} y={B} width={goalAreaW} height={goalAreaH} fill="none" stroke={LC} strokeWidth={LW} />

      {/* Area di rigore */}
      <Rect x={penX} y={B} width={penW} height={penH} fill="none" stroke={LC} strokeWidth={LW} />

      {/* Punto di rigore */}
      <Circle cx={W / 2} cy={B + penSpotY} r={3} fill={LC} />

      {/* Lunetta (arco sotto l'area di rigore) */}
      <Path
        d={`M ${W / 2 - arcR * 0.75} ${B + penH} A ${arcR} ${arcR} 0 0 0 ${W / 2 + arcR * 0.75} ${B + penH}`}
        fill="none"
        stroke={LC}
        strokeWidth={LW}
      />

      {/* Linea di centrocampo (bordo inferiore) */}
      <Line x1={B} y1={H - B} x2={W - B} y2={H - B} stroke={LC} strokeWidth={LW} />

      {/* Semicerchio centrocampo */}
      <Path
        d={`M ${W / 2 - centerR} ${H - B} A ${centerR} ${centerR} 0 0 1 ${W / 2 + centerR} ${H - B}`}
        fill="none"
        stroke={LC}
        strokeWidth={LW}
      />
    </Svg>
  );
}

// Schermata "Ruota il telefono"
function RotatePrompt() {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View style={styles.rotateContainer}>
      <Ionicons name="phone-landscape-outline" size={64} color={colors.accent} />
      <ThemedText type="title" style={styles.rotateTitle}>{t('builder.rotateTitle')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rotateSubtitle}>
        {t('builder.rotateSubtitle')}
      </ThemedText>
    </View>
  );
}

interface Props {
  initialLayout?: FieldElement[];
  onDone: (layout: FieldElement[]) => void;
}

export function FieldBuilder({ initialLayout, onDone }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = screenW > screenH;

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const [elements, setElements] = useState<FieldElement[]>(initialLayout ?? []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ w: width, h: height });
  }, []);

  // Usa lo spazio reale misurato dal container
  const safeLeft = Math.max(insets.left, PADDING);
  const cW = containerSize?.w ?? (screenW - safeLeft * 2);
  const cH = containerSize?.h ?? screenH;

  // Campo: si adatta allo spazio reale, max 60% larghezza per sidebar
  const maxFieldW = cW * 0.60;
  const fWFromH = cH / HALF_FIELD_RATIO;
  const fW = Math.min(fWFromH, maxFieldW);
  const fH = fW * HALF_FIELD_RATIO;
  const sidebarW = cW - fW - PADDING;

  const addElement = useCallback((type: ElementType) => {
    haptic('light');
    const cx = snapToGrid(fW / 2 - ELEMENT_SIZE / 2);
    const cy = snapToGrid(fH / 2 - ELEMENT_SIZE / 2);
    const base = { type, x: cx, y: cy, rotation: 0 };
    setElements((prev) => [
      ...prev,
      type === 'arrow' ? { ...base, length: DEFAULT_ARROW_LEN } : base,
    ]);
    setSelectedIndex(null);
  }, [fW, fH]);

  const moveElement = useCallback((index: number, x: number, y: number) => {
    setElements((prev) => prev.map((el, i) => (i === index ? { ...el, x, y } : el)));
  }, []);

  const resizeArrow = useCallback((index: number, length: number) => {
    setElements((prev) => prev.map((el, i) => (i === index ? { ...el, length } : el)));
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIndex == null) return;
    haptic('light');
    setElements((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(null);
  }, [selectedIndex]);

  const undoLast = useCallback(() => {
    if (elements.length === 0) return;
    haptic('light');
    setElements((prev) => prev.slice(0, -1));
    setSelectedIndex(null);
  }, [elements.length]);

  const showTooltip = useCallback((labelKey: string) => {
    setTooltip(t(labelKey));
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 1500);
  }, [t]);

  const handleLongPress = useCallback((item: PaletteItem) => {
    haptic('light');
    showTooltip(item.labelKey);
  }, [showTooltip]);

  const handleDone = useCallback(async () => {
    haptic('medium');
    // Normalizza coordinate a 0–1 relative al campo
    const normalized = elements.map((el) => ({
      ...el,
      x: el.x / fW,
      y: el.y / fH,
      ...(el.length != null ? { length: el.length / fW } : {}),
    }));
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    onDone(normalized);
  }, [elements, fW, fH, onDone]);

  if (!isLandscape) {
    return <RotatePrompt />;
  }

  return (
    <View style={[styles.landscapeRoot, { paddingLeft: safeLeft + PADDING, paddingRight: PADDING }]} onLayout={onContainerLayout}>
      {/* Campo a sinistra */}
      <View style={[styles.field, { width: fW, height: fH }]}>
        <FieldSvg width={fW} height={fH} />
        {elements.map((el, i) =>
          el.type === 'arrow' ? (
            <DraggableArrow
              key={i}
              element={el}
              index={i}
              selected={selectedIndex === i}
              fieldW={fW}
              fieldH={fH}
              onSelect={setSelectedIndex}
              onMove={moveElement}
              onResize={resizeArrow}
            />
          ) : (
            <DraggableElement
              key={i}
              element={el}
              index={i}
              selected={selectedIndex === i}
              fieldW={fW}
              fieldH={fH}
              onSelect={setSelectedIndex}
              onMove={moveElement}
            />
          ),
        )}
      </View>

      {/* Sidebar destra compatta */}
      <View style={[styles.sidebar, { width: sidebarW }]}>
        {/* Icone su 2 righe (4+3) centrate */}
        <View style={styles.paletteSection}>
          <View style={styles.paletteRow}>
            {PALETTE.slice(0, 4).map((item) => (
              <Pressable
                key={item.type}
                onPress={() => addElement(item.type)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400}
                style={({ pressed }) => [styles.paletteItem, pressed && { opacity: 0.6 }]}>
                <ThemedView type="backgroundElement" style={styles.paletteIcon}>
                  <Ionicons name={item.icon as any} size={24} color={getElementColor(item.type)} />
                </ThemedView>
              </Pressable>
            ))}
          </View>
          <View style={styles.paletteRow}>
            {PALETTE.slice(4).map((item) => (
              <Pressable
                key={item.type}
                onPress={() => addElement(item.type)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400}
                style={({ pressed }) => [styles.paletteItem, pressed && { opacity: 0.6 }]}>
                <ThemedView type="backgroundElement" style={styles.paletteIcon}>
                  <Ionicons name={item.icon as any} size={24} color={getElementColor(item.type)} />
                </ThemedView>
              </Pressable>
            ))}
          </View>

          {/* Tooltip long-press o hint */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
            {tooltip ?? t('builder.hint')}
          </ThemedText>
        </View>

        {/* Contatore per tipo — solo elementi usati */}
        <View style={styles.countersWrap}>
          {PALETTE.filter((item) => item.type !== 'arrow' && elements.some((el) => el.type === item.type)).map((item) => {
            const count = elements.filter((el) => el.type === item.type).length;
            const isActive = selectedIndex != null && elements[selectedIndex]?.type === item.type;
            return (
              <View key={item.type} style={[styles.counterRow, isActive && { backgroundColor: colors.backgroundElement, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }]}>
                <Ionicons name={item.icon as any} size={16} color={getElementColor(item.type)} />
                <ThemedText type="small" themeColor={isActive ? 'text' : 'textSecondary'}>{t(item.labelKey)} <ThemedText type="smallBold">×{count}</ThemedText></ThemedText>
              </View>
            );
          })}
        </View>

        {/* Undo + elimina + conferma */}
        <View style={styles.bottomActions}>
          <View style={styles.midActions}>
            <Pressable
              onPress={undoLast}
              disabled={elements.length === 0}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.backgroundElement, opacity: elements.length === 0 ? 0.3 : pressed ? 0.7 : 1 },
              ]}>
              <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
            </Pressable>

            {selectedIndex != null && (
              <Pressable
                onPress={deleteSelected}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.dangerSoft }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handleDone}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}>
            <Ionicons name="checkmark" size={20} color={colors.accentText} />
            <ThemedText type="smallBold" style={{ color: colors.accentText, marginLeft: 6 }}>
              {t('builder.confirm')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  rotateTitle: {
    textAlign: 'center',
    fontSize: 20,
  },
  rotateSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  landscapeRoot: {
    flex: 1,
    flexDirection: 'row',
    gap: PADDING,
  },
  field: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  element: {
    position: 'absolute',
    width: ELEMENT_SIZE,
    height: ELEMENT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elementSelectedRing: {
    backgroundColor: 'rgba(111, 194, 44, 0.25)',
    borderWidth: 2,
    borderColor: '#6FC22C',
    borderRadius: ELEMENT_SIZE / 2,
  },
  elementSelectedIcon: {
    textShadowColor: '#6FC22C',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  arrowContainer: {
    position: 'absolute',
    height: 24,
    justifyContent: 'center',
  },
  arrowSelected: {
    backgroundColor: 'rgba(111, 194, 44, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6FC22C',
    paddingHorizontal: 4,
  },
  arrowLine: {
    height: 3,
    borderRadius: 2,
  },
  arrowHead: {
    position: 'absolute',
    top: 4,
  },
  arrowTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  arrowHandle: {
    position: 'absolute',
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  sidebar: {
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  paletteSection: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  paletteItem: {
    alignItems: 'center',
  },
  paletteIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    textAlign: 'center',
    fontSize: 10,
    marginTop: 2,
  },
  countersWrap: {
    gap: 6,
    paddingHorizontal: Spacing.two,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterLabel: {
    flex: 1,
    fontSize: 12,
  },
  counterValue: {
    minWidth: 20,
    textAlign: 'right',
  },
  bottomActions: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  midActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
