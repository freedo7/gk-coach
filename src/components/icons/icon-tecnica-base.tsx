import Svg, { G, Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

// Due mani a forma di W (vista frontale, dita verso l'alto)
// La mano destra è il mirror della sinistra
export function IconTecnicaBase({ size = 28, color = '#6FC22C' }: Props) {
  // Outline di una mano con 4 dita visibili (percorso in senso orario)
  const handPath = `
    M1 28
    L1 19
    Q1 17 2.5 16
    L2.5 11 Q2.5 9 4 9 Q5.5 9 5.5 11 L5.5 16
    L5.5 10 Q5.5 8 7 8 Q8.5 8 8.5 10 L8.5 16
    L8.5 11 Q8.5 9 10 9 Q11.5 9 11.5 11 L11.5 16
    L11.5 12 Q11.5 10 13 10 Q14.5 10 14.5 12 L14.5 19
    Q14.5 20 13 20
    L3 20 Q1 20 1 19 Z
  `;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Mano sinistra */}
      <Path
        d={handPath}
        stroke={color}
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Mano destra: specchio orizzontale intorno a x=16 */}
      <G transform="scale(-1,1) translate(-32,0)">
        <Path
          d={handPath}
          stroke={color}
          strokeWidth="1.6"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
