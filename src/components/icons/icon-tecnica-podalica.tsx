import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

// Scarpa da calcio vista di lato (punta verso destra)
export function IconTecnicaPodalica({ size = 28, color = '#6FC22C' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Colletto caviglia (sinistra/retro) */}
      <Path
        d="M3 20 L3 8 Q3 5 6 5 Q9 5 9 8 L9 12"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Parte superiore (dall'ankle al puntale) */}
      <Path
        d="M9 12 Q11 9 17 9 L25 11 Q30 13 30 17 Q30 20 27 20"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Puntale arrotondato */}
      <Path
        d="M27 20 Q31 20 31 23 Q31 25 27 25"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Suola */}
      <Path
        d="M3 20 L27 20 L27 25 L3 25 Q2 25 2 23 Q2 20 3 20"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Tacchetti */}
      <Path d="M6 25 L6 29" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M12 25 L12 29" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M18 25 L18 29" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M24 25 L24 29" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* Lacci */}
      <Path d="M11 10.5 L23 12" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M10 12.5 L22 14" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M10 14.5 L21 16" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  );
}
