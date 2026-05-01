import { getColorSchemaGray } from "../../../../util/color/appColorSchema";
import { setCanvasFont } from "../../../../util/canvasTools";
import { color2String, TpColor } from "../../../../util/color/color";
import { getColorRamp } from "../../../../util/color/colorRamps";
import { createInternalError } from "../../../../util/errors";
import { getGammaFactor } from "../../../../util/misc";
import { getRangeTicks } from "../../../../util/renderHelpers";
import { getArrayValueRange, getRangeSize, restrictRange, TpRange, TpRange2D, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { TpVisualSetup } from "../helpers/helpers";
import { TpElemInfo } from "../interface";
import { TpCanvas2DLegendHor } from "../canvas-2d/interface";
import { TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { getColorPalette } from "../../../../util/color/colorPalettes";
import { getAxisName } from "../canvas-2d/helpers";


export function getColorValueRangeInfo(visualSetup: TpVisualSetup) {
    if (!visualSetup.channelEncodings.color) throw createInternalError(`Chart is missing color channel`);
    const colorValueRange = getArrayValueRange(visualSetup.channelEncodings.color, true);
    const restrictedColorValueRange = restrictRange(colorValueRange!, visualSetup.configSettings.colorRangeMin, visualSetup.configSettings.colorRangeMax);

    const colorRampId = visualSetup.configSettings.colorRamp;
    let colorRamp = getColorRamp(colorRampId).colors;
    if (visualSetup.configSettings.colorRampSwapped) colorRamp = colorRamp.toReversed();

    return {
        colorValueRange,
        restrictedColorValueRange,
        colorRamp,
    }
}

export function getColorPaletteInfo(visualSetup: TpVisualSetup) {
    if (!visualSetup.channelEncodings.color) throw createInternalError(`Chart is missing color channel`);

    const colorPaletteId = visualSetup.configSettings.colorCategoricalPalette;
    let colorPalette = getColorPalette(colorPaletteId).colors;

    return {
        colorPalette
    }
}



export const LEGEND_TYPE_COLOR = 'legendColors';


export function renderColorRangeLegendBase(
    legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D,
    centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D,
    colorValueRange: TpRange, restrictedColorValueRange: TpRange, colorRamp: TpColor[], name: string) {
    const pixelRatio = centralViewport.pixelRatio;

    const layerData = legend.layerData;
    const visualSetup = layerData.visualSetup;
    if (!visualSetup) return;

    const top = (displayRange.y.min + 10) * pixelRatio;
    const left = displayRange.x.min * pixelRatio;
    const width = getRangeSize(displayRange.x) * pixelRatio;

    const colorGammaFactor = getGammaFactor(visualSetup.configSettings.colorGammaFactor);

    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
    canvasCtx.textAlign = 'left';
    canvasCtx.textBaseline = 'top';
    setCanvasFont(canvasCtx, pixelRatio, 10);
    canvasCtx.fillText(name, left, top);

    const colorCount = colorRamp.length;
    for (let i = 0; i < colorCount; i++) {
        let fr = i / colorCount;
        const colorVal = colorValueRange.min + fr * (colorValueRange.max - colorValueRange.min);
        fr = (colorVal - restrictedColorValueRange.min) / (restrictedColorValueRange.max - restrictedColorValueRange.min);
        fr = Math.max(0, Math.min(1, fr));
        canvasCtx.fillStyle = color2String(colorRamp[Math.round(fr ** colorGammaFactor * (colorCount - 1))])
        canvasCtx.fillRect(
            Math.round(left + width * i / colorCount),
            top + 18 * pixelRatio,
            Math.round(left + width * (i + 1) / colorCount) - Math.round(left + width * i / colorCount),
            7 * pixelRatio);
    }


    canvasCtx.fillStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.strokeStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.lineWidth = pixelRatio;
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'top';
    const rangeMin = colorValueRange!.min;
    const rangeMax = colorValueRange!.max;
    const ticks = getRangeTicks({ min: rangeMin, max: rangeMax }, 4);
    for (const tick of ticks) {
        canvasCtx.beginPath();
        canvasCtx.lineWidth = pixelRatio * (tick.label ? 2 : 1);
        const x = left + (tick.value - rangeMin) / (rangeMax - rangeMin) * width;
        canvasCtx.moveTo(x, top + 27 * pixelRatio);
        canvasCtx.lineTo(x, top + 33 * pixelRatio);
        if (tick.label) {
            canvasCtx.fillText(tick.label, x, top + 35 * pixelRatio);

        }
        canvasCtx.stroke()
    }

}

export function renderColorRangeLegend(legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D, elemInfo: TpElemInfo) {

    const visualSetup = legend.layerData.visualSetup;
    if (!visualSetup) return;

    const { colorValueRange, restrictedColorValueRange, colorRamp } = getColorValueRangeInfo(visualSetup);
    const name = getAxisName(visualSetup.channelEncodings.color);

    renderColorRangeLegendBase(
        legend, canvasCtx,
        centralViewport, displayRange,
        colorValueRange, restrictedColorValueRange, colorRamp, name);
}


export function renderColorCategoriesLegend(legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D, elemInfo: TpElemInfo) {
    const visualSetup = legend.layerData.visualSetup;
    if (!visualSetup) return;

    const { colorPalette } = getColorPaletteInfo(visualSetup);
    const name = visualSetup.channelEncodings.color.name;
    const pixelRatio = centralViewport.pixelRatio;

    const colorChannel = visualSetup.channelEncodings.color;
    const states = colorChannel.categoricalStatesList!;

    canvasCtx.textAlign = 'left';
    canvasCtx.textBaseline = 'top';
    setCanvasFont(canvasCtx, pixelRatio, 10);
    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));

    const offsetTop = displayRange.y.min * pixelRatio;
    const offsetLeft = displayRange.x.min * pixelRatio;
    const width = getRangeSize(displayRange.x) * pixelRatio;

    let top = 12 * pixelRatio;

    canvasCtx.fillText(name + ':', offsetLeft, offsetTop + top);

    let left = canvasCtx.measureText(name + ':').width + 8 * pixelRatio;
    const rd = 5 * pixelRatio;
    for (let stateIdx = 0; stateIdx < Math.min(states.length, colorPalette.length - 1); stateIdx++) {
        const label = states[stateIdx];
        const itemSize = canvasCtx.measureText(label).width + 10 * pixelRatio;
        if (left + itemSize >= width) {
            left = 0;
            top += 20 * pixelRatio;
        }
        canvasCtx.fillStyle = color2String(colorPalette[stateIdx]);
        // canvasCtx.fillRect(offsetLeft+left, offsetTop+top, 10 * pixelRatio, 12 * pixelRatio);
        canvasCtx.beginPath();
        canvasCtx.arc(offsetLeft + left + rd, offsetTop + top + rd + 1 * pixelRatio, rd, 0, 2 * Math.PI);
        canvasCtx.fill();
        left += 2 * rd + 3 * pixelRatio;
        canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
        canvasCtx.fillText(label, offsetLeft + left, offsetTop + top);

        left += itemSize;

    }

}
