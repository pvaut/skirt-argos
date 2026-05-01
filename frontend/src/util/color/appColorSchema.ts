import { getColorHex, interpolateColors, TpColor } from "./color";


interface TpAppColorSchema {
    colorBg1: TpColor;
    colorBg2: TpColor;
    colorBg3: TpColor;
    colorFg: TpColor;
    colorSp1: TpColor;
    colorSp2: TpColor;
}


export const theAppColorSchema: TpAppColorSchema = {
    colorBg1: getColorHex('#33323e'),
    colorBg2: getColorHex('#21212a'),
    colorBg3: getColorHex('#000000'),
    colorFg: getColorHex('#dfdfdf'),
    colorSp1: getColorHex('#6fa8dc'),
    colorSp2: getColorHex('#ffe599'),
}


export function getColorSchemaGray(fr: number): TpColor {
    return interpolateColors(theAppColorSchema.colorFg, theAppColorSchema.colorBg3, fr);
}