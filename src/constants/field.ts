import type { ElementType } from '@/types/database';

// ─── Costanti dimensioni ───
export const ELEMENT_SIZE = 36;
/** Element size as fraction of field width — used by both builder and preview */
export const ELEMENT_SIZE_RATIO = 0.045;
export const PADDING = 12;
export const DEFAULT_ARROW_LEN = 80;
export const MIN_ARROW_LEN = 30;
export const MAX_ARROW_LEN = 250;
export const SNAP_GRID = 10;
export const HALF_FIELD_RATIO = 503 / 1126; // matches field-bg.jpg aspect

// ─── Snap worklet ───
export function snapToGrid(val: number): number {
  'worklet';
  return Math.round(val / SNAP_GRID) * SNAP_GRID;
}

// ─── Scala default per tipo elemento ───
export function getDefaultScale(type: ElementType): number {
  switch (type) {
    case 'disc': return 0.55;
    case 'hurdle': return 1.3;
    case 'ladder': return 1.45;
    case 'agility_ring': return 1.15;
    case 'pole': return 1.45;
    case 'rebounder': return 1.45;
    case 'medicine_ball': return 0.7;
    case 'gk_catch_low': return 1.75;
    case 'gk_catch_front': return 1.6;
    case 'gk_kick': return 1.9;
    case 'gk_dive_low': return 1.75;
    case 'gk_dive_front': return 1.6;
    case 'mannequin': return 1.45;
    case 'small_goal': return 1.15;
    case 'ball': return 0.85;
    default: return 1;
  }
}

// ─── Colori per tipo elemento ───
export function getElementColor(type: ElementType): string {
  switch (type) {
    case 'cone': return '#FF9500';
    case 'mannequin': return '#AF52DE';
    case 'ball': return '#FFFFFF';
    case 'cube': return '#FF3B30';
    case 'arrow': return '#5AC8FA';
    case 'hurdle': return '#FFD60A';
    case 'ladder': return '#FF9F0A';
    case 'agility_ring': return '#BF5AF2';
    case 'disc': return '#FF9500';
    case 'pole': return '#AC8E68';
    case 'small_goal': return '#E0E0E0';
    case 'rebounder': return '#8E8E93';
    case 'mini_pole': return '#AC8E68';
    case 'medicine_ball': return '#8B4513';
    case 'gk_catch_low': return '#30D158';
    case 'gk_catch_front': return '#0A84FF';
    case 'gk_kick': return '#30D158';
    case 'gk_dive_low': return '#0A84FF';
    case 'gk_dive_front': return '#30D158';
    case 'drawing': return '#FFFFFF';
    default: return '#FFFFFF';
  }
}

// ─── Icone Ionicons (per tipi originali e nuovi con fallback) ───
export function getElementIcon(type: ElementType): string {
  switch (type) {
    case 'cone': return 'triangle-outline';
    case 'mannequin': return 'person-outline';
    case 'ball': return 'football-outline';
    case 'cube': return 'cube-outline';
    case 'arrow': return 'arrow-forward-outline';
    case 'hurdle': return 'remove-outline';
    case 'ladder': return 'reorder-four-outline';
    case 'agility_ring': return 'ellipse-outline';
    case 'disc': return 'radio-button-on-outline';
    case 'pole': return 'golf-outline';
    case 'small_goal': return 'tablet-landscape-outline';
    case 'rebounder': return 'grid-outline';
    case 'mini_pole': return 'golf-outline';
    case 'medicine_ball': return 'basketball-outline';
    case 'gk_catch_low': return 'body-outline';
    case 'gk_catch_front': return 'body-outline';
    case 'gk_kick': return 'body-outline';
    case 'gk_dive_low': return 'body-outline';
    case 'gk_dive_front': return 'body-outline';
    case 'drawing': return 'pencil-outline';
    default: return 'help-outline';
  }
}

// ─── Palette con categorie ───
export interface PaletteItem {
  type: ElementType;
  labelKey: string;
}

export interface PaletteCategory {
  key: string;
  icon: string;
  items: PaletteItem[];
}

export const PALETTE_CATEGORIES: PaletteCategory[] = [
  {
    key: 'builder.catEquipment',
    icon: 'construct-outline',
    items: [
      { type: 'cone', labelKey: 'builder.cone' },
      { type: 'disc', labelKey: 'builder.disc' },
      { type: 'cube', labelKey: 'builder.cube' },
      { type: 'hurdle', labelKey: 'builder.hurdle' },
      { type: 'ladder', labelKey: 'builder.ladder' },
      { type: 'agility_ring', labelKey: 'builder.ring' },
      { type: 'pole', labelKey: 'builder.pole' },
      { type: 'rebounder', labelKey: 'builder.rebounder' },
      { type: 'mini_pole', labelKey: 'builder.miniPole' },
      { type: 'medicine_ball', labelKey: 'builder.medicineBall' },
    ],
  },
  {
    key: 'builder.catPlayers',
    icon: 'people-outline',
    items: [
      { type: 'gk_catch_low', labelKey: 'builder.gkCatchLow' },
      { type: 'gk_catch_front', labelKey: 'builder.gkCatchFront' },
      { type: 'gk_kick', labelKey: 'builder.gkKick' },
      { type: 'gk_dive_low', labelKey: 'builder.gkDiveLow' },
      { type: 'gk_dive_front', labelKey: 'builder.gkDiveFront' },
      { type: 'mannequin', labelKey: 'builder.mannequin' },
    ],
  },
  {
    key: 'builder.catGoals',
    icon: 'football-outline',
    items: [
      { type: 'small_goal', labelKey: 'builder.smallGoal' },
      { type: 'ball', labelKey: 'builder.ball' },
    ],
  },
  {
    key: 'builder.catMovement',
    icon: 'trending-up-outline',
    items: [
      { type: 'arrow', labelKey: 'builder.arrow' },
    ],
  },
];

// Flat palette per backward compat
export const ALL_PALETTE_ITEMS: PaletteItem[] = PALETTE_CATEGORIES.flatMap((c) => c.items);
