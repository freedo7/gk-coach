import { useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, ClipPath, Rect, Circle, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import type { FieldElement } from '@/types/database';

const HALF_FIELD_RATIO = 52.5 / 68;

type ElementType = FieldElement['type'];

function getElementIcon(type: ElementType): string {
  const icons: Record<ElementType, string> = {
    cone: 'triangle-outline',
    mannequin: 'person-outline',
    ball: 'football-outline',
    goalkeeper: 'body-outline',
    goal: 'browsers-outline',
    cube: 'cube-outline',
    arrow: 'arrow-forward-outline',
  };
  return icons[type] ?? 'help-outline';
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

function FieldSvg({ width: W, height: H }: { width: number; height: number }) {
  const B = 6;
  const LW = 2;
  const LC = 'rgba(255,255,255,0.9)';
  const STRIPES = 10;
  const SH = H / STRIPES;

  const penW = W * (40.32 / 68);
  const penH = H * (16.5 / 52.5);
  const penX = (W - penW) / 2;
  const goalAreaW = W * (18.32 / 68);
  const goalAreaH = H * (5.5 / 52.5);
  const goalAreaX = (W - goalAreaW) / 2;
  const goalW = W * (7.32 / 68);
  const goalH = Math.max(H * (2 / 52.5), 6);
  const goalX = (W - goalW) / 2;
  const penSpotY = H * (11 / 52.5);
  const arcR = W * (9.15 / 68);
  const centerR = W * (9.15 / 68);

  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      <Defs>
        <ClipPath id="previewClip">
          <Rect x={0} y={0} width={W} height={H} rx={6} />
        </ClipPath>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="#3a8c3f" rx={6} />
      {Array.from({ length: STRIPES }).map((_, i) =>
        i % 2 === 0 ? (
          <Rect key={i} x={0} y={i * SH} width={W} height={SH} fill="#439648" clipPath="url(#previewClip)" />
        ) : null,
      )}
      <Rect x={B} y={B} width={W - B * 2} height={H - B * 2} fill="none" stroke={LC} strokeWidth={LW} />
      <Rect x={goalX} y={B - goalH} width={goalW} height={goalH} fill="none" stroke={LC} strokeWidth={LW} clipPath="url(#previewClip)" />
      <Rect x={goalAreaX} y={B} width={goalAreaW} height={goalAreaH} fill="none" stroke={LC} strokeWidth={LW} />
      <Rect x={penX} y={B} width={penW} height={penH} fill="none" stroke={LC} strokeWidth={LW} />
      <Circle cx={W / 2} cy={B + penSpotY} r={3} fill={LC} />
      <Path
        d={`M ${W / 2 - arcR * 0.75} ${B + penH} A ${arcR} ${arcR} 0 0 0 ${W / 2 + arcR * 0.75} ${B + penH}`}
        fill="none" stroke={LC} strokeWidth={LW}
      />
      <Line x1={B} y1={H - B} x2={W - B} y2={H - B} stroke={LC} strokeWidth={LW} />
      <Path
        d={`M ${W / 2 - centerR} ${H - B} A ${centerR} ${centerR} 0 0 1 ${W / 2 + centerR} ${H - B}`}
        fill="none" stroke={LC} strokeWidth={LW}
      />
    </Svg>
  );
}

function StaticElement({ element, fieldW, fieldH, normalized }: { element: FieldElement; fieldW: number; fieldH: number; normalized: boolean }) {
  // Se normalizzato (0–1) moltiplica per campo, altrimenti scala proporzionalmente
  const posX = normalized ? element.x * fieldW : element.x * (fieldW / 400);
  const posY = normalized ? element.y * fieldH : element.y * (fieldH / 310);
  const iconScale = fieldW / 350;
  const size = Math.max(24, 36 * iconScale);
  const iconSize = Math.max(18, 28 * iconScale);

  if (element.type === 'arrow') {
    const rawLen = element.length ?? (normalized ? 0.12 : 80);
    const len = normalized ? rawLen * fieldW : rawLen * (fieldW / 400);
    const arrowScale = Math.max(0.6, iconScale);
    return (
      <View style={[styles.arrowWrap, { left: posX, top: posY }]}>
        <View style={[styles.arrowLine, { width: len, backgroundColor: '#5AC8FA', height: 3 * arrowScale }]} />
        <View style={[styles.arrowHead, { left: len - 6 * arrowScale }]}>
          <View style={{
            width: 0, height: 0,
            borderTopWidth: 8 * arrowScale,
            borderBottomWidth: 8 * arrowScale,
            borderLeftWidth: 12 * arrowScale,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: '#5AC8FA',
          }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.staticElement, { left: posX, top: posY, width: size, height: size }]}>
      <Ionicons name={getElementIcon(element.type) as any} size={iconSize} color={getElementColor(element.type)} />
    </View>
  );
}

// Rileva se le coordinate sono normalizzate (0–1) o pixel assoluti
function isNormalized(layout: FieldElement[]): boolean {
  return layout.every((el) => el.x <= 1 && el.y <= 1);
}

interface Props {
  layout: FieldElement[];
}

export function FieldPreview({ layout }: Props) {
  const normalized = isNormalized(layout);
  const colors = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  // Anteprima: larghezza piena della card
  const previewW = screenW - Spacing.four * 2;
  const previewH = previewW * HALF_FIELD_RATIO;

  // Fullscreen: usa più spazio possibile
  const maxW = Math.max(screenW, screenH) * 0.9;
  const maxH = Math.min(screenW, screenH) * 0.85;
  const fullW = Math.min(maxW, maxH / HALF_FIELD_RATIO);
  const fullH = fullW * HALF_FIELD_RATIO;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
        <View style={[styles.previewContainer, { width: previewW, height: previewH }]}>
          <FieldSvg width={previewW} height={previewH} />
          {layout.map((el, i) => (
            <StaticElement key={i} element={el} fieldW={previewW} fieldH={previewH} normalized={normalized} />
          ))}
        </View>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent statusBarTranslucent>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={[styles.modalField, { width: fullW, height: fullH }]}>
            <FieldSvg width={fullW} height={fullH} />
            {layout.map((el, i) => (
              <StaticElement key={i} element={el} fieldW={fullW} fieldH={fullH} normalized={normalized} />
            ))}
          </View>
          <View style={[styles.closeHint, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  staticElement: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowWrap: {
    position: 'absolute',
    height: 24,
    justifyContent: 'center',
  },
  arrowLine: {
    borderRadius: 2,
  },
  arrowHead: {
    position: 'absolute',
    top: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  modalField: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  closeHint: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
