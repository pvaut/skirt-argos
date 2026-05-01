import { createInternalError } from "../errors";
import { darken, getColor, saturate, TpColor } from "./color";


export type TpColorPalette = { // used for discrete categorical colors
    id: string;
    name: string;
    colors: TpColor[];
};



function createColorPalette(id: string, name: string, divergent: boolean, colors: TpColor[]): TpColorPalette {
    return {
        id,
        name,
        colors,//: colors.map(col => desaturate(col, -1)),
    };
}


const largeColorsetBase = [
    getColor(150, 150, 250),
    getColor(250, 150, 150),
    getColor(180, 240, 240),
    getColor(130, 185, 200),
    getColor(50, 50, 180),
    getColor(195, 210, 250),
    getColor(160, 155, 190),
    getColor(235, 170, 240),
    getColor(195, 145, 195),
    getColor(190, 245, 200),
    getColor(250, 128, 0),
    getColor(130, 175, 135),
    getColor(215, 230, 200),
    getColor(150, 50, 50),
    getColor(130, 210, 150),
    getColor(150, 250, 150),
    getColor(180, 155, 139),
    getColor(245, 220, 200),
    getColor(215, 150, 145),
    getColor(250, 200, 190),
    getColor(205, 190, 175),
    getColor(160, 165, 140),
    getColor(230, 230, 130),
    getColor(250, 200, 130),
    getColor(255, 125, 195),
]

export const theColorPalettes: TpColorPalette[] = [
    createColorPalette('default', 'Default', false, [
        getColor(175, 130, 200),
        getColor(110, 190, 110),
        getColor(250, 180, 115),
        getColor(255, 255, 120),
        getColor(50, 80, 170),
        getColor(230, 0, 120),
        getColor(180, 80, 20),
        getColor(128, 128, 128), // last color is always the overflow color
    ]),
    createColorPalette('primary', 'Primary colors', false, [
        getColor(0, 255, 0),
        getColor(255, 0, 0),
        getColor(0, 0, 255),
        getColor(255, 255, 0),
        getColor(0, 255, 255),
        getColor(255, 0, 255),
        getColor(255, 128, 0),
        getColor(128, 128, 128), // last color is always the overflow color
    ]),
    createColorPalette('large_1', 'Large', false, [
        ...largeColorsetBase.map(cl => saturate(darken(cl, 0.25), 1.75)),
        getColor(128, 128, 128), // last color is always the overflow color
    ]),

];


export function getColorPalette(id: string): TpColorPalette {
    const palette = theColorPalettes.find(plt => plt.id == id);
    if (!palette) throw createInternalError(`Invalid color palette id: ${id}`);
    return palette;
}