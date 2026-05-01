import { getColorSchemaGray } from "../../../../util/color/appColorSchema";
import { setCanvasFont } from "../../../../util/canvasTools";
import { color2String } from "../../../../util/color/color";
import { getColorRamp } from "../../../../util/color/colorRamps";
import { getRangeTicks } from "../../../../util/renderHelpers";
import { getRangeSize, TpRange2D, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { TpElemInfo } from "../interface";
import { TpCanvas2DLegendHor } from "../canvas-2d/interface";
import { TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { TpLayerDataSpecificsPointsVelocityVolume } from "../canvas-volume/layer-types/layer-points-velocity/layerPointsVelocity.Interface";





export const LEGEND_TYPE_LOS_VELOC = 'legendLosVeloc';



export function renderLosVelocLegend(legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D, elemInfo: TpElemInfo) {
    const pixelRatio = centralViewport.pixelRatio;

    const layerData = legend.layerData;
    const visualSetup = layerData.visualSetup;
    if (!visualSetup) return;

    const customData = layerData.customData as TpLayerDataSpecificsPointsVelocityVolume;

    const colorRampId = visualSetup.configSettings.colorRamp;
    let colorRamp = getColorRamp(colorRampId).colors;


    const top = (displayRange.y.min + 10) * pixelRatio;
    const left = displayRange.x.min * pixelRatio;
    const width = getRangeSize(displayRange.x) * pixelRatio;

    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
    canvasCtx.textAlign = 'left';
    canvasCtx.textBaseline = 'top';
    setCanvasFont(canvasCtx, pixelRatio, 10);
    canvasCtx.fillText("Line of sight velocity", left, top);

    const colorCount = colorRamp.length;
    for (let i = 0; i < colorCount; i++) {
        let fr = i / colorCount;
        fr = Math.max(0, Math.min(1, fr));
        canvasCtx.fillStyle = color2String(colorRamp[Math.round(fr * (colorCount - 1))])
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
    const rangeMin = -customData.velocHalfRange!;
    const rangeMax = +customData.velocHalfRange!;
    const ticks = getRangeTicks({ min: rangeMin, max: rangeMax }, 4);
    for (const tick of ticks) {
        canvasCtx.beginPath();
        canvasCtx.lineWidth = pixelRatio * (tick.label ? 2 : 1);
        const x = left + (tick.value - rangeMin) / (rangeMax - rangeMin) * width;
        canvasCtx.moveTo(x, top + 27 * pixelRatio);
        canvasCtx.lineTo(x, top + 33 * pixelRatio);
        if (tick.label) canvasCtx.fillText(tick.label, x, top + 35 * pixelRatio);
        canvasCtx.stroke()
    }

}
