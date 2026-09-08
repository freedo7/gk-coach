import type { ElementType } from '@/types/database';
import { ImageSourcePropType } from 'react-native';

/**
 * Static require() map for realistic PNG element images.
 * Elements without a PNG (arrow) fall back to Ionicons.
 */
export const FIELD_ELEMENT_IMAGES: Partial<Record<ElementType, ImageSourcePropType>> = {
  cone: require('@/assets/images/field-elements/cone.png'),
  mannequin: require('@/assets/images/field-elements/mannequin.png'),
  ball: require('@/assets/images/field-elements/ball.png'),
  hurdle: require('@/assets/images/field-elements/hurdle.png'),
  ladder: require('@/assets/images/field-elements/ladder.png'),
  agility_ring: require('@/assets/images/field-elements/agility_ring.png'),
  disc: require('@/assets/images/field-elements/disc.png'),
  pole: require('@/assets/images/field-elements/pole.png'),
  small_goal: require('@/assets/images/field-elements/small_goal.png'),
  cube: require('@/assets/images/field-elements/cube.png'),
  rebounder: require('@/assets/images/field-elements/rebounder.png'),
  mini_pole: require('@/assets/images/field-elements/mini_pole.png'),
  medicine_ball: require('@/assets/images/field-elements/medicine_ball.png'),
  gk_catch_low: require('@/assets/images/field-elements/gk_catch_low.png'),
  gk_catch_front: require('@/assets/images/field-elements/gk_catch_front.png'),
  gk_kick: require('@/assets/images/field-elements/gk_kick.png'),
  gk_dive_low: require('@/assets/images/field-elements/gk_dive_low.png'),
  gk_dive_front: require('@/assets/images/field-elements/gk_dive_front.png'),
};
