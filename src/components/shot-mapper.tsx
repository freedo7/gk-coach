import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, ClipPath, Rect, Circle, Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/hooks/use-haptic';
import { Radius, Spacing } from '@/constants/theme';
import type { ShotEvent } from '@/types/database';

// Mezzo campo reale: 52.5m di lunghezza × 68m di larghezza
const HALF_FIELD_RATIO = 52.5 / 68;
const HALF_FIELD_LENGTH_M = 52.5;
const GOAL_ASPECT = 7.32 / 2.44;

type Step = 'field' | 'goal' | 'outcome';

// ─── Mezzo campo con porta IN BASSO ───
function FieldSvg({ width: W, height: H }: { width: number; height: number }) {
  const B = 4; const LW = 1.5; const LC = 'rgba(255,255,255,0.85)';
  const STRIPES = 10; const SH = H / STRIPES;

  // Proporzioni FIFA (dal basso: porta → area piccola → area grande → centrocampo)
  const penW = W * (40.32 / 68); const penH = H * (16.5 / 52.5);
  const penX = (W - penW) / 2; const penY = H - B - penH;

  const goalAreaW = W * (18.32 / 68); const goalAreaH = H * (5.5 / 52.5);
  const goalAreaX = (W - goalAreaW) / 2; const goalAreaY = H - B - goalAreaH;

  const goalW = W * (7.32 / 68); const goalH = Math.max(H * (2 / 52.5), 4);
  const goalX = (W - goalW) / 2;

  const penSpotY = H - B - H * (11 / 52.5);
  const arcR = W * (9.15 / 68);
  const centerR = W * (9.15 / 68);

  // Altezza extra sotto il campo per il rettangolino della porta
  const svgH = H + goalH + B;

  return (
    <Svg width={W} height={svgH} style={[StyleSheet.absoluteFill, { top: 0, left: 0 }]}>
      <Defs><ClipPath id="fc"><Rect x={0} y={0} width={W} height={H} rx={6} /></ClipPath></Defs>
      <Rect x={0} y={0} width={W} height={svgH} fill="#3a8c3f" rx={6} />
      {Array.from({ length: STRIPES }).map((_, i) =>
        i % 2 === 0 ? <Rect key={i} x={0} y={i * SH} width={W} height={SH} fill="#439648" clipPath="url(#fc)" /> : null
      )}
      {/* Bordo */}
      <Rect x={B} y={B} width={W - B * 2} height={H - B * 2} fill="none" stroke={LC} strokeWidth={LW} />
      {/* Porta (rettangolino che sporge sotto la linea di fondo) */}
      <Rect x={goalX} y={H - B} width={goalW} height={goalH} fill="none" stroke={LC} strokeWidth={LW} />
      {/* Area piccola */}
      <Rect x={goalAreaX} y={goalAreaY} width={goalAreaW} height={goalAreaH} fill="none" stroke={LC} strokeWidth={LW} />
      {/* Area di rigore */}
      <Rect x={penX} y={penY} width={penW} height={penH} fill="none" stroke={LC} strokeWidth={LW} />
      {/* Punto di rigore */}
      <Circle cx={W / 2} cy={penSpotY} r={2.5} fill={LC} />
      {/* Lunetta (arco sopra l'area di rigore) */}
      <Path d={`M ${W / 2 - arcR * 0.75} ${penY} A ${arcR} ${arcR} 0 0 1 ${W / 2 + arcR * 0.75} ${penY}`} fill="none" stroke={LC} strokeWidth={LW} />
      {/* Linea centrocampo (bordo superiore) */}
      <Line x1={B} y1={B} x2={W - B} y2={B} stroke={LC} strokeWidth={LW} />
      {/* Semicerchio centrocampo */}
      <Path d={`M ${W / 2 - centerR} ${B} A ${centerR} ${centerR} 0 0 0 ${W / 2 + centerR} ${B}`} fill="none" stroke={LC} strokeWidth={LW} />
    </Svg>
  );
}

// ─── Porta frontale (traversa + 2 pali, aperta sotto) ───
function GoalSvg({ width: W, height: H }: { width: number; height: number }) {
  const P = 6; // spessore pali/traversa
  const netSpacing = W / 14;

  return (
    <Svg width={W} height={H}>
      {/* Sfondo rete scuro */}
      <Rect x={P} y={P} width={W - P * 2} height={H - P} fill="#1a4a1c" />
      {/* Rete verticale */}
      {Array.from({ length: Math.floor(W / netSpacing) }).map((_, i) => (
        <Line key={`v${i}`} x1={(i + 1) * netSpacing} y1={P} x2={(i + 1) * netSpacing} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />
      ))}
      {/* Rete orizzontale */}
      {Array.from({ length: Math.ceil(H / netSpacing) }).map((_, i) => (
        <Line key={`h${i}`} x1={P} y1={P + (i + 1) * netSpacing} x2={W - P} y2={P + (i + 1) * netSpacing} stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />
      ))}
      {/* Traversa (barra bianca in alto) */}
      <Rect x={0} y={0} width={W} height={P} fill="#FFFFFF" rx={2} />
      {/* Palo sinistro */}
      <Rect x={0} y={0} width={P} height={H} fill="#FFFFFF" rx={2} />
      {/* Palo destro */}
      <Rect x={W - P} y={0} width={P} height={H} fill="#FFFFFF" rx={2} />
    </Svg>
  );
}

// ─── Curva di Bézier (campo con porta in basso → traiettoria va verso il basso) ───
function shotCurvePath(s: ShotEvent, fieldW: number, fieldH: number): string {
  const sx = s.fromX * fieldW;
  const sy = s.fromY * fieldH;
  // Arrivo: toX mappato sulla larghezza della porta nel campo
  // La porta è centrata, larga ~10.76% del campo
  const goalStartX = fieldW * ((68 - 7.32) / 2 / 68);
  const goalEndX = fieldW - goalStartX;
  const ex = goalStartX + s.toX * (goalEndX - goalStartX);
  const ey = fieldH; // bordo inferiore = porta
  // Punto di controllo
  const midY = sy + (ey - sy) * 0.6;
  let cpx = (sx + ex) / 2;
  if (s.curve === 'left') cpx -= fieldW * 0.15;
  else if (s.curve === 'right') cpx += fieldW * 0.15;

  return `M ${sx} ${sy} Q ${cpx} ${midY} ${ex} ${ey}`;
}

// Calcola distanza dalla porta in metri (y=0 è centrocampo, y=1 è linea di porta)
function distanceFromGoal(fromY: number): number {
  return Math.round((1 - fromY) * HALF_FIELD_LENGTH_M);
}

interface Props {
  visible: boolean;
  shots: ShotEvent[];
  onClose: (shots: ShotEvent[]) => void;
}

export function ShotMapper({ visible, shots: initialShots, onClose }: Props) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [shots, setShots] = useState<ShotEvent[]>(initialShots);
  const [step, setStep] = useState<Step>('field');
  const [fromPos, setFromPos] = useState<{ x: number; y: number } | null>(null);
  const [toPos, setToPos] = useState<{ x: number; y: number } | null>(null);

  const handleShow = useCallback(() => {
    setShots(initialShots);
    setStep('field');
    setFromPos(null);
    setToPos(null);
  }, [initialShots]);

  const fieldW = screenW - Spacing.four * 2;
  const fieldH = fieldW * HALF_FIELD_RATIO;
  const goalW = fieldW * 0.65;
  const goalH = goalW / GOAL_ASPECT;

  const handleFieldTap = useCallback((e: { nativeEvent: { locationX: number; locationY: number } }) => {
    haptic('light');
    const x = Math.max(0, Math.min(1, e.nativeEvent.locationX / fieldW));
    const y = Math.max(0, Math.min(1, e.nativeEvent.locationY / fieldH));
    setFromPos({ x, y });
    setStep('goal');
  }, [fieldW, fieldH]);

  const handleGoalTap = useCallback((e: { nativeEvent: { locationX: number; locationY: number } }) => {
    haptic('light');
    const x = Math.max(0, Math.min(1, e.nativeEvent.locationX / goalW));
    const y = Math.max(0, Math.min(1, e.nativeEvent.locationY / goalH));
    setToPos({ x, y });
    setStep('outcome');
  }, [goalW, goalH]);

  const addShot = useCallback((outcome: ShotEvent['outcome'], curve: ShotEvent['curve']) => {
    if (!fromPos || !toPos) return;
    haptic('medium');
    setShots((prev) => [...prev, {
      fromX: fromPos.x, fromY: fromPos.y,
      toX: toPos.x, toY: toPos.y,
      outcome, curve,
      distance: distanceFromGoal(fromPos.y),
    }]);
    setFromPos(null);
    setToPos(null);
    setStep('field');
  }, [fromPos, toPos]);

  const undoLast = useCallback(() => {
    haptic('light');
    if (step === 'goal' && fromPos) {
      // Annulla la selezione del campo
      setFromPos(null);
      setStep('field');
    } else if (step === 'outcome' && toPos) {
      // Annulla la selezione della porta
      setToPos(null);
      setStep('goal');
    } else {
      // Annulla l'ultimo tiro salvato
      setShots((prev) => prev.slice(0, -1));
    }
  }, [step, fromPos, toPos]);

  const goalCount = shots.filter((s) => s.outcome === 'goal').length;
  const saveCount = shots.filter((s) => s.outcome === 'save').length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={handleShow} onRequestClose={() => onClose(initialShots)}>
      <ThemedView style={[styles.container, { paddingTop: Spacing.three, backgroundColor: '#000' }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header con legenda */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable onPress={() => onClose(initialShots)} hitSlop={8}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
              <ThemedText type="title" style={{ fontSize: 18 }}>{t('shotMapper.title')}</ThemedText>
            </View>
            <View style={styles.legend}>
              <View style={[styles.legendBadge, { backgroundColor: '#FF3B3020' }]}>
                <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
                <ThemedText type="small" style={{ color: '#FF3B30' }}>{t('shotMapper.goals')}</ThemedText>
                {goalCount > 0 && <ThemedText type="smallBold" style={{ color: '#FF3B30' }}>{goalCount}</ThemedText>}
              </View>
              <View style={[styles.legendBadge, { backgroundColor: '#30D15820' }]}>
                <View style={[styles.legendDot, { backgroundColor: '#30D158' }]} />
                <ThemedText type="small" style={{ color: '#30D158' }}>{t('shotMapper.saves')}</ThemedText>
                {saveCount > 0 && <ThemedText type="smallBold" style={{ color: '#30D158' }}>{saveCount}</ThemedText>}
              </View>
            </View>
          </View>

          {/* Istruzione */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.instruction}>
            {step === 'field' && t('shotMapper.tapField')}
            {step === 'goal' && t('shotMapper.tapGoal')}
            {step === 'outcome' && t('shotMapper.chooseOutcome')}
          </ThemedText>

          {/* Campo con porta in basso */}
          <Pressable onPress={step === 'field' ? handleFieldTap : undefined}>
            <View style={[styles.fieldContainer, { width: fieldW, height: fieldH + 14 }]}>
                <FieldSvg width={fieldW} height={fieldH} />
                {/* Traiettorie */}
                <Svg width={fieldW} height={fieldH} style={StyleSheet.absoluteFill} pointerEvents="none">
                  {shots.map((s, i) => (
                    <Path key={i} d={shotCurvePath(s, fieldW, fieldH)} fill="none"
                      stroke={s.outcome === 'goal' ? '#FF3B30' : '#30D158'}
                      strokeWidth={2} strokeDasharray={s.outcome === 'save' ? '6,4' : undefined} />
                  ))}
                </Svg>
                {/* Punti partenza salvati con numero */}
                {shots.map((s, i) => (
                  <View key={i} style={[styles.shotNumberDot, {
                    left: s.fromX * fieldW - 10, top: s.fromY * fieldH - 10,
                    backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158',
                  }]}>
                    <ThemedText style={styles.shotNumberText}>{i + 1}</ThemedText>
                  </View>
                ))}
                {/* Punto corrente con numero */}
                {fromPos && (
                  <View style={[styles.shotNumberDot, {
                    left: fromPos.x * fieldW - 10, top: fromPos.y * fieldH - 10,
                    backgroundColor: colors.accent,
                  }]}>
                    <ThemedText style={styles.shotNumberText}>{shots.length + 1}</ThemedText>
                  </View>
                )}
            </View>
          </Pressable>

          {/* Porta frontale */}
          <Pressable onPress={step === 'goal' ? handleGoalTap : undefined}>
            <View style={[styles.goalContainer, { width: goalW, height: goalH, opacity: step === 'field' ? 0.4 : 1 }]}>
              <GoalSvg width={goalW} height={goalH} />
              {/* Impatti salvati con numero */}
              {shots.map((s, i) => (
                <View key={i} style={[styles.shotNumberDot, {
                  left: s.toX * goalW - 10, top: s.toY * goalH - 10,
                  backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158',
                }]}>
                  <ThemedText style={styles.shotNumberText}>{i + 1}</ThemedText>
                </View>
              ))}
              {/* Impatto corrente con numero */}
              {toPos && (
                <View style={[styles.shotNumberDot, {
                  left: toPos.x * goalW - 10, top: toPos.y * goalH - 10,
                  backgroundColor: colors.accent,
                }]}>
                  <ThemedText style={styles.shotNumberText}>{shots.length + 1}</ThemedText>
                </View>
              )}
            </View>
          </Pressable>

          {/* Distanze dalla porta */}
          {(shots.length > 0 || fromPos) && (
            <View style={styles.distanceList}>
              {shots.map((s, i) => (
                <View key={i} style={styles.distanceRow}>
                  <View style={[styles.distanceNumberDot, { backgroundColor: s.outcome === 'goal' ? '#FF3B30' : '#30D158' }]}>
                    <ThemedText style={styles.distanceNumberText}>{i + 1}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">~{s.distance ?? distanceFromGoal(s.fromY)}m</ThemedText>
                </View>
              ))}
              {fromPos && (
                <View style={styles.distanceRow}>
                  <View style={[styles.distanceNumberDot, { backgroundColor: colors.accent }]}>
                    <ThemedText style={styles.distanceNumberText}>{shots.length + 1}</ThemedText>
                  </View>
                  <ThemedText type="smallBold" themeColor="accent">~{distanceFromGoal(fromPos.y)}m</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Scelta esito + curva */}
          {step === 'outcome' && (
            <View style={styles.outcomeSection}>
              <View style={styles.curveRow}>
                {(['left', 'straight', 'right'] as const).map((c) => (
                  <Pressable key={c} onPress={() => addShot('goal', c)}
                    style={({ pressed }) => [styles.outcomeBtn, { backgroundColor: '#FF3B30' }, pressed && { opacity: 0.7 }]}>
                    <Ionicons name={c === 'straight' ? 'arrow-down' : c === 'left' ? 'return-down-back' : 'return-down-forward'} size={18} color="#FFF" />
                    <View>
                      <ThemedText type="small" style={styles.outcomeBtnText}>{t('shotMapper.goal')}</ThemedText>
                      <ThemedText type="small" style={styles.outcomeBtnSub}>
                        {t(`shotMapper.${c === 'left' ? 'curveLeft' : c === 'right' ? 'curveRight' : 'straight'}`)}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>
              <View style={styles.curveRow}>
                {(['left', 'straight', 'right'] as const).map((c) => (
                  <Pressable key={c} onPress={() => addShot('save', c)}
                    style={({ pressed }) => [styles.outcomeBtn, { backgroundColor: '#30D158' }, pressed && { opacity: 0.7 }]}>
                    <Ionicons name={c === 'straight' ? 'arrow-down' : c === 'left' ? 'return-down-back' : 'return-down-forward'} size={18} color="#FFF" />
                    <View>
                      <ThemedText type="small" style={styles.outcomeBtnText}>{t('shotMapper.save')}</ThemedText>
                      <ThemedText type="small" style={styles.outcomeBtnSub}>
                        {t(`shotMapper.${c === 'left' ? 'curveLeft' : c === 'right' ? 'curveRight' : 'straight'}`)}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Barra azioni fissa in basso */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.two }]}>
          <Pressable
            onPress={undoLast}
            disabled={shots.length === 0 && !fromPos && !toPos}
            style={({ pressed }) => [styles.undoBtn, { backgroundColor: colors.backgroundElement, opacity: (shots.length === 0 && !fromPos && !toPos) ? 0.3 : pressed ? 0.7 : 1 }]}>
            <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
            <ThemedText type="small">{t('shotMapper.undo')}</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => onClose(shots)}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}>
            <Ionicons name="checkmark" size={20} color={colors.accentText} />
            <ThemedText type="smallBold" style={{ color: colors.accentText }}>{t('shotMapper.done')}</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  scroll: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  legendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  instruction: {
    textAlign: 'center',
  },
  fieldContainer: {
    borderRadius: 6,
    overflow: 'visible',
  },
  goalContainer: {
    borderRadius: 4,
    overflow: 'visible',
    alignSelf: 'center',
  },
  distanceList: {
    gap: 4,
    alignSelf: 'flex-start',
    width: '100%',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceNumberDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceNumberText: {
    color: '#FFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  shotNumberDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotNumberText: {
    color: '#FFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  outcomeSection: {
    gap: Spacing.two,
    width: '100%',
  },
  curveRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  outcomeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
  },
  outcomeBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  outcomeBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    width: '100%',
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    height: 48,
    borderRadius: 24,
  },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 24,
  },
});
