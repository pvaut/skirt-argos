import { TpColumnData } from "../../data/tables/interface";
import { TpPoint2D } from "./point2D";


export interface TpRange {
    min: number;
    max: number;
}


export interface TpRange2D {
    x: TpRange;
    y: TpRange;
}


export function createEmptyRange(): TpRange {
    return {
        min: Number.MAX_VALUE,
        max: -Number.MAX_VALUE,
    }
}


export function createEmptyRange2D(): TpRange2D {
    return {
        x: createEmptyRange(),
        y: createEmptyRange(),
    }
}


export function isNonEmptyRange(range: TpRange) {
    return range.max > range.min;
}


export function getRangeSize(range: TpRange) {
    return range.max - range.min;
}


export function combineRange(targetRange: TpRange, expansion: TpRange): void {
    if (targetRange.max < expansion.max) targetRange.max = expansion.max;
    if (targetRange.min > expansion.min) targetRange.min = expansion.min;
}


export function combineRange2D(targetRange: TpRange2D, expansion: TpRange2D): void {
    combineRange(targetRange.x, expansion.x);
    combineRange(targetRange.y, expansion.y);
}


export function extendRangeAbsolute(targetRange: TpRange, extensionValue: number): void {
    targetRange.min -= 0.5 * extensionValue;
    targetRange.max += 0.5 * extensionValue;
}


export function extendRangeRelative(targetRange: TpRange, extensionFraction: number): void {
    const size = targetRange.max - targetRange.min;
    targetRange.min -= 0.5 * extensionFraction * size;
    targetRange.max += 0.5 * extensionFraction * size;
}


export function extendRange2DRelative(targetRange: TpRange2D, extensionFraction: number): void {
    extendRangeRelative(targetRange.x, extensionFraction);
    extendRangeRelative(targetRange.y, extensionFraction);
}


export function isPointInRange2D(targetRange: TpRange2D, point: TpPoint2D): boolean {
    return (point.x >= targetRange.x.min) && (point.x <= targetRange.x.max) && (point.y >= targetRange.y.min) && (point.y <= targetRange.y.max);
}


export function rangeOverlaps(range1: TpRange, range2: TpRange): boolean {
    return (range2.max > range1.min) && (range2.min < range1.max);
}


export function range2DOverlaps(range1: TpRange2D, range2: TpRange2D): boolean {
    return rangeOverlaps(range1.x, range2.x) && rangeOverlaps(range1.y, range2.y)
}


export function getArrayValueRange(column: TpColumnData, makeSafe: boolean): TpRange {
    if (column.cache.valueRange)
        return { ...column.cache.valueRange };// deep copy because someone may modify this!

    const array = column.values;
    let min = Number.MAX_VALUE;
    let max = -Number.MAX_VALUE;
    for (let i = 0; i < array.length; i++) {
        if (array[i] < min) min = array[i];
        if (array[i] > max) max = array[i];
    }
    if (makeSafe) {
        if (min >= Number.MAX_VALUE / 2) min = 0;
        if (max <= min) {
            min -= 0.5;
            max = min + 1;
        }
    }
    const valueRange: TpRange = { min, max };
    column.cache.valueRange = valueRange;
    return { ...valueRange }; // deep copy because someone may modify this!
}


export function getArrayAverage(column: TpColumnData): number {
    if (column.cache.average)
        return column.cache.average;

    const array = column.values;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < array.length; i++) {
        if (!isNaN(array[i])) {
            sum += array[i];
            count++;
        }
    }
    const average = (count > 0) ? sum / count : 0.0;
    column.cache.average = average;
    return average;
}


export function getArrayStdDev(column: TpColumnData): number {
    if (column.cache.stdev)
        return column.cache.stdev;

    const average = getArrayAverage(column);
    const array = column.values;
    let sumsq = 0;
    let count = 0;
    for (let i = 0; i < array.length; i++) {
        if (!isNaN(array[i])) {
            sumsq += (array[i] - average) ** 2;
            count++;
        }
    }
    const stdev = (count > 0) ? Math.sqrt(sumsq / count) : 0.0;
    column.cache.stdev = stdev;
    return stdev;
}


export function restrictRange(range: TpRange, fracMin: number, fracMax: number): TpRange {
    if (fracMax < fracMin + 0.01) {
        const center = (fracMin + fracMax) / 2;
        return {
            min: Math.max(0, center - 0.01),
            max: Math.min(1, center + 0.01),
        }
    }
    return {
        min: range.min + fracMin * (range.max - range.min),
        max: range.min + fracMax * (range.max - range.min),
    }
}


export interface TpRangeMapper {
    zoom: number; // determines what fraction of the source (logical) range to use. if set to 1, the source range maps exactly to the destination range
    pan: number; // defined relative to the source (logical) range
}


// Manages how 2D coordinates are converted from logical (source) units to display (destination) units
export interface TpViewport2D {
    aspectRatio11: boolean; // if true, the same distance in logical X,Y coordinates results in the same distance in X,Y display coordinates
    logicalRange: TpRange2D; // the X,Y range in the source logical coordinates

    displayRange: TpRange2D; // the X,Y range of the displayed viewport, in display coordinates 

    mapX: TpRangeMapper; // determines how the X source logical coordinates map to the display coordinates
    mapY: TpRangeMapper; // determines how the Y source logical coordinates map to the display coordinates

    totalDisplayWidth: number; // in display coords
    totalDisplayHeight: number; // in display coords
    pixelRatio: number; // converts from display coordinates to (canvas) element render coordinates, in order to accomodate resolution oversampling
}


export function createViewport2D(aspectRatio11: boolean): TpViewport2D {
    return {
        aspectRatio11,
        logicalRange: createEmptyRange2D(),
        displayRange: createEmptyRange2D(),
        mapX: { zoom: 1, pan: 0 },
        mapY: { zoom: 1, pan: 0 },
        totalDisplayWidth: 1,
        totalDisplayHeight: 1,
        pixelRatio: 2,
    };
}


export function resetViewport2DZoomPan(vp: TpViewport2D) {
    vp.mapX.zoom = 1;
    vp.mapX.pan = 0;
    vp.mapY.zoom = 1;
    vp.mapY.pan = 0;
}


export function setViewport2DLogicalRange(viewport: TpViewport2D, logicalRange: TpRange2D): void {
    viewport.logicalRange = structuredClone(logicalRange);
}


export function setViewport2DDisplayRange(viewport: TpViewport2D, displayRange: TpRange2D): void {
    viewport.displayRange = structuredClone(displayRange);
}


function zoomDimension(mapper: TpRangeMapper, logicalRange: TpRange, factor: number, centerLogical: number) {
    let newZoomFactor = Math.max(1, mapper.zoom * factor);
    newZoomFactor = Math.min(newZoomFactor, 100);//@todo: make max zoom factor configurable?
    const currentZoomFactor = mapper.zoom;
    const currentPan = mapper.pan;
    const lf = (centerLogical - logicalRange.min) / (logicalRange.max - logicalRange.min);
    const newPan = (currentZoomFactor / newZoomFactor) * (lf + currentPan) - lf;
    mapper.zoom = newZoomFactor;
    mapper.pan = newPan;
}


export function zoomViewport2D(viewport: TpViewport2D, factor: number, centerLogicalX: number, centerLogicalY: number): void {
    const corrLogicalRange = getCorrectedLogicalRange(viewport);
    zoomDimension(viewport.mapX, corrLogicalRange.x, factor, centerLogicalX);
    zoomDimension(viewport.mapY, corrLogicalRange.y, factor, centerLogicalY);
    clipPan(viewport.mapX);
    clipPan(viewport.mapY);
}


function clipPan(rangeMapper: TpRangeMapper) {
    rangeMapper.pan = Math.min(rangeMapper.pan, 0);
    rangeMapper.pan = Math.max(rangeMapper.pan, 1 / rangeMapper.zoom - 1);
}


export function panViewport2D(viewport: TpViewport2D, coordConvertors: TpViewport2DCoordConvertors, panX: number, panY: number): void {
    // note: panX, panY should be in display coordinates
    const panXLogical = coordConvertors.xDisp2Logic(panX) - coordConvertors.xDisp2Logic(0);
    const panYLogical = coordConvertors.yDisp2Logic(panY) - coordConvertors.yDisp2Logic(0);
    viewport.mapX.pan += panXLogical / getRangeSize(coordConvertors.corrLogicalRange.x);
    clipPan(viewport.mapX);
    viewport.mapY.pan += panYLogical / getRangeSize(coordConvertors.corrLogicalRange.y);
    clipPan(viewport.mapY);
}


export function isValidViewport2D(viewport: TpViewport2D): boolean {
    return isNonEmptyRange(viewport.logicalRange.x) &&
        isNonEmptyRange(viewport.logicalRange.y) &&
        isNonEmptyRange(viewport.displayRange.x) &&
        isNonEmptyRange(viewport.displayRange.y)
}


export type TpCoordConvertor = (coord: number) => number;


function createCoordConvertor(logicalRange: TpRange, displayRange: TpRange, convert: TpRangeMapper, invert: boolean): {
    factor: number,
    offset: number,
} {
    // Conversion logic:
    // coord_l =  logical source coordinate
    // coord_d = resulting display coordinate
    // coord_el = resulting element coordinate
    //  * convert to fraction of logical range:                   lf = (coord_l-lmin) / (lmax-lmin)
    //  * apply conversion on logical range fraction:             lfzp = (lf+pan) * zoom
    //  * convert converted logical fraction to display coords:   coord_d = dmin + lfzp * (dmax-dmin)

    const logicalRangeSize = getRangeSize(logicalRange);
    let renderRangeSize = getRangeSize(displayRange);
    let minDisplay = displayRange.min;
    if (invert) {
        renderRangeSize = -renderRangeSize;
        minDisplay = displayRange.max;
    }

    const factor = (convert.zoom * renderRangeSize) / logicalRangeSize;
    const offset = (-logicalRange.min / logicalRangeSize + convert.pan) * convert.zoom * renderRangeSize + minDisplay;

    return { factor, offset }
    //To be used as: coord_d = coord_l * factor + offset;
}


export interface TpViewport2DCoordConvertors {
    xLogic2Disp: TpCoordConvertor,
    yLogic2Disp: TpCoordConvertor,
    xLogic2Elem: TpCoordConvertor, // note: elem coords take into account the pixelRatio
    yLogic2Elem: TpCoordConvertor,
    xDisp2Logic: TpCoordConvertor,
    yDisp2Logic: TpCoordConvertor,
    xElem2Logic: TpCoordConvertor,
    yElem2Logic: TpCoordConvertor,
    sizeDisp2Elem: TpCoordConvertor, // tis essentially applies the pixelRatio
    corrLogicalRange: TpRange2D,
    gpur: { // used for WebGL 2D rendering, where the display coordinates are always ranging [-1, 1]
        offsetX: number;
        offsetY: number;
        zoomX: number;
        zoomY: number;
    }
}


function getCorrectedLogicalRange(viewport: TpViewport2D): TpRange2D {
    let corrLogicalRangeX = { ...viewport.logicalRange.x };
    let corrLogicalRangeY = { ...viewport.logicalRange.y };
    if (viewport.aspectRatio11) {
        const sizeLogicalY = getRangeSize(corrLogicalRangeY);
        const sizeLogicalX = getRangeSize(corrLogicalRangeX);
        const sizeDisplayY = getRangeSize(viewport.displayRange.y);
        const sizeDisplayX = getRangeSize(viewport.displayRange.x);
        const aspectRatioLogical = sizeLogicalY / sizeLogicalX;
        const aspectRatioDisplay = sizeDisplayY / sizeDisplayX;
        if (aspectRatioDisplay > aspectRatioLogical) {
            // expand Y logical range so that the Y axis compresses to match X axis
            extendRangeAbsolute(corrLogicalRangeY, sizeLogicalY * aspectRatioDisplay / aspectRatioLogical - sizeLogicalY);
        } else {
            // expand X logical range so that the X axis compresses to match Y axis
            extendRangeAbsolute(corrLogicalRangeX, sizeLogicalX * aspectRatioLogical / aspectRatioDisplay - sizeLogicalX);
        }
    }

    return {
        x: corrLogicalRangeX,
        y: corrLogicalRangeY,
    }
}


export function getViewport2DCoordConvertors(viewport: TpViewport2D): TpViewport2DCoordConvertors {
    const corrLogicalRange = getCorrectedLogicalRange(viewport);

    // Used for conventional html canvas rendering
    const convX = createCoordConvertor(corrLogicalRange.x, viewport.displayRange.x, viewport.mapX, false);
    const factorX = convX.factor;
    const offsetX = convX.offset;
    const convY = createCoordConvertor(corrLogicalRange.y, viewport.displayRange.y, viewport.mapY, true);
    const factorY = convY.factor;
    const offsetY = convY.offset;

    const factorXElem = factorX * viewport.pixelRatio;
    const factorYElem = factorY * viewport.pixelRatio;
    const offsetXElem = offsetX * viewport.pixelRatio;
    const offsetYElem = offsetY * viewport.pixelRatio;

    // Used for WebGL 2D rendering, where the display range is always [-1, +1]
    const gpurRange: TpRange = { min: -1, max: 1 }
    const convXGPUR = createCoordConvertor(corrLogicalRange.x, gpurRange, viewport.mapX, false);
    const convYGPUR = createCoordConvertor(corrLogicalRange.y, gpurRange, viewport.mapY, false);

    return {
        xLogic2Disp: (coord: number): number => (coord * factorX + offsetX),
        yLogic2Disp: (coord: number): number => (coord * factorY + offsetY),
        xLogic2Elem: (coord: number): number => (coord * factorXElem + offsetXElem),
        yLogic2Elem: (coord: number): number => (coord * factorYElem + offsetYElem),
        xDisp2Logic: (coord: number): number => ((coord - offsetX) / factorX),
        yDisp2Logic: (coord: number): number => ((coord - offsetY) / factorY),
        xElem2Logic: (coord: number): number => ((coord - offsetXElem) / factorXElem),
        yElem2Logic: (coord: number): number => ((coord - offsetYElem) / factorYElem),
        sizeDisp2Elem: (coord: number): number => (coord * viewport.pixelRatio),
        corrLogicalRange,
        gpur: {
            offsetX: convXGPUR.offset,
            offsetY: convYGPUR.offset,
            zoomX: convXGPUR.factor,
            zoomY: convYGPUR.factor,
        }
    }
}


export interface TpSliceState { // used when a slice of a total range is displayed
    minFrac: number;
    maxFrac: number;
}


export function createSliceState(): TpSliceState {
    return {
        minFrac: 0.45,
        maxFrac: 0.55,
    }
}