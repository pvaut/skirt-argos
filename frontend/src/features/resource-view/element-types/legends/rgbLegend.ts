import { getColorSchemaGray } from "../../../../util/color/appColorSchema";
import { setCanvasFont } from "../../../../util/canvasTools";
import { color2String, getColor, TpColor } from "../../../../util/color/color";
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




export const LEGEND_TYPE_RGB = 'legendRGB';



export function renderRGBLegend(legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D, elemInfo: TpElemInfo) {

    const visualSetup = legend.layerData.visualSetup;
    if (!visualSetup) return;
    const pixelRatio = centralViewport.pixelRatio;

    const { nameR, nameG, nameB } = (legend.customData! as any);

    const top = (displayRange.y.min + 10) * pixelRatio;
    let left = displayRange.x.min * pixelRatio;
    const width = getRangeSize(displayRange.x) * pixelRatio;

    canvasCtx.textAlign = 'left';
    canvasCtx.textBaseline = 'top';
    setCanvasFont(canvasCtx, pixelRatio, 10);

    canvasCtx.fillStyle = color2String(getColor(255, 50, 50));
    canvasCtx.fillRect(left, top, 14 * pixelRatio, 14 * pixelRatio);
    left += 18 * pixelRatio;
    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
    canvasCtx.fillText(nameR, left, top + 1 * pixelRatio);
    left += canvasCtx.measureText(nameR).width + 15 * pixelRatio;


    canvasCtx.fillStyle = color2String(getColor(0,255,0));
    canvasCtx.fillRect(left, top, 14 * pixelRatio, 14 * pixelRatio);
    left += 18 * pixelRatio;
    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
    canvasCtx.fillText(nameG, left, top + 1 * pixelRatio);
    left += canvasCtx.measureText(nameG).width + 10 * pixelRatio;

    canvasCtx.fillStyle = color2String(getColor(70,70,255));
    canvasCtx.fillRect(left, top, 14 * pixelRatio, 14 * pixelRatio);
    left += 18 * pixelRatio;
    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
    canvasCtx.fillText(nameB, left, top + 1 * pixelRatio);
    left += canvasCtx.measureText(nameB).width + 10 * pixelRatio;




    // const { colorValueRange, restrictedColorValueRange, colorRamp } = getColorValueRangeInfo(visualSetup);
    // const name = getAxisName(visualSetup.channelEncodings.color);

    // renderColorRangeLegendBase(
    //     legend, canvasCtx,
    //     centralViewport, displayRange,
    //     colorValueRange, restrictedColorValueRange, colorRamp, name);
}

