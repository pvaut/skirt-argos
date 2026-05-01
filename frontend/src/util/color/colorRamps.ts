import { createInternalError } from "../errors";
import { getColor, interpolateColors, TpColor } from "./color";


const COLOR_RAMP_COUNT = 512;


export type TpColorRamp = {
    id: string;
    name: string;
    divergent: boolean;
    colors: TpColor[];
};


function createColorRamp(id: string, name: string, divergent: boolean, colorStops: TpColor[]): TpColorRamp {
    const colors = [];
    for (let i = 0; i < COLOR_RAMP_COUNT; i++) {
        const frac = i / COLOR_RAMP_COUNT;
        const stopIndex = Math.floor(frac * (colorStops.length - 1));
        const subFrac = frac * (colorStops.length - 1) - stopIndex;
        const theColor = interpolateColors(colorStops[stopIndex], colorStops[stopIndex + 1], 1 - subFrac);
        colors.push(theColor);
    }
    return {
        id,
        name,
        divergent,
        colors,
    };
}


export const theColorRamps: TpColorRamp[] = [

    createColorRamp('default', 'Default', false, [
        getColor(52, 25, 215),
        getColor(18, 124, 215),
        getColor(5, 163, 200),
        getColor(77, 188, 145),
        getColor(247, 243, 17),
        getColor(249, 186, 65),
        getColor(249, 150, 20),
    ]),

    createColorRamp('defaultToBlack', 'Default (to black)', false, [
        getColor(0, 0, 0),
        getColor(0, 0, 128),
        getColor(52, 25, 215),
        getColor(18, 124, 215),
        getColor(5, 163, 200),
        getColor(77, 188, 145),
        getColor(247, 243, 17),
        getColor(249, 186, 65),
        getColor(249, 150, 20),
    ]),

    createColorRamp('magma', 'Plasma', false, [
        getColor(40, 5, 123),
        getColor(100, 20, 123),
        getColor(172, 40, 128),
        getColor(248, 130, 91),
        getColor(253, 161, 5),
        getColor(255, 199, 129),
        getColor(255, 255, 211),
    ]),

    createColorRamp('magmaToBlack', 'Plasma (to black)', false, [
        getColor(0, 0, 0),
        getColor(100, 20, 123),
        getColor(172, 40, 128),
        getColor(248, 130, 91),
        getColor(253, 161, 5),
        getColor(255, 199, 129),
        getColor(255, 255, 211),
    ]),


    createColorRamp('magma2', 'Plasma - 2', false, [
        getColor(30, 100, 123),
        getColor(100, 50, 123),
        getColor(172, 40, 128),
        getColor(248, 130, 91),
        getColor(253, 161, 5),
        getColor(255, 199, 129),
        getColor(255, 255, 211),
    ]),

    createColorRamp('rainbow', 'Rainbow', false, [
        getColor(100, 70, 255),
        getColor(0, 180, 180),
        getColor(220, 220, 0),
        getColor(250, 160, 90),
        getColor(255, 5, 70),
    ]),

    createColorRamp('rainbow2', 'Rainbow - 2', false, [
        getColor(30, 30, 210),
        getColor(150, 200, 150),
        getColor(220, 220, 0),
        getColor(250, 160, 90),
        getColor(160, 5, 70),
    ]),

    createColorRamp('redBlue1', 'Red - Blue 1', true, [
        getColor(170, 0, 0),
        getColor(255, 80, 0),
        getColor(255, 128, 30),
        getColor(255, 255, 255),
        getColor(30, 170, 255),
        getColor(0, 100, 255),
        getColor(0, 0, 170),
    ]),

    createColorRamp('redBlue2', 'Red - Blue 2', true, [
        getColor(60, 0, 0),
        getColor(100, 0, 0),
        getColor(140, 40, 0),
        getColor(200, 80, 0),
        getColor(200, 128, 0),
        getColor(255, 255, 255),
        getColor(0, 150, 200),
        getColor(0, 100, 200),
        getColor(0, 50, 140),
        getColor(0, 0, 110),
        getColor(0, 0, 80),
    ]),

    createColorRamp('greenOrange1', 'Green - Orange', true, [
        getColor(0, 140, 80),
        getColor(67, 140, 130),
        getColor(165, 195, 165),
        getColor(255, 255, 255),
        getColor(230, 165, 120),
        getColor(195, 90, 50),
        getColor(195, 70, 0),

    ]),

    createColorRamp('grayscale', 'Gray scale', false, [
        getColor(0, 0, 0),
        getColor(255, 255, 255),
    ]),
]


export function getColorRamp(id: string): TpColorRamp {
    const ramp = theColorRamps.find(ramp => ramp.id == id);
    if (!ramp) throw createInternalError(`Invalid color ramp id: ${id}`);
    return ramp;
}