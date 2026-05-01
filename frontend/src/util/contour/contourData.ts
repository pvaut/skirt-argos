import { ContourMipmap } from "./contourAlgo";


export type TpContourLine = { x: number, y: number }[];


export interface TpContourLevel {
    value: number;
    lines: TpContourLine[];
}


export interface TpContourGridMapping {
    x: {offset: number; step: number};
    y: {offset: number; step: number};
}


export interface TpContourData {
    levels: TpContourLevel[];
    gridMapping: TpContourGridMapping;
}


export interface TpContourSettings {
    desiredLevelCount: number;
    smoothKernelWidth: number;
}


export function calcContours(raster: Float32Array, resolX: number, resolY: number, settings: TpContourSettings, gridMapping: TpContourGridMapping): TpContourData {

    const mipmap = new ContourMipmap(raster, resolX, resolY);

    let maxVal = -Number.MAX_VALUE;
    let minVal = Number.MAX_VALUE;
    for (let idx = 0; idx < resolX * resolY; idx++) {
        if (maxVal < raster[idx]) maxVal = raster[idx];
        if (minVal > raster[idx]) minVal = raster[idx];
    }

    const levels: TpContourLevel[] = [];
    for (let levelIdx = 0; levelIdx < settings.desiredLevelCount; levelIdx++) {
        const levelValue = minVal + (levelIdx + 0.1) / settings.desiredLevelCount * (maxVal - minVal);
        const cnt = mipmap.contour(levelValue, { smoothKernelWidth: settings.smoothKernelWidth, smoothCycles: 8 });
        const level: TpContourLevel = {
            value: levelValue,
            lines: [],
        }
        levels.push(level);
        for (const lne of cnt) {
            const line: TpContourLine = [];
            for (const pt of lne) line.push({x: pt[0], y: pt[1]});
            level.lines.push(line);
        }
    }

    return {
        levels,
        gridMapping,
    };
}