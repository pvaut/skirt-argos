import { getColorSchemaGray } from "../../../../util/color/appColorSchema";
import { setCanvasFont } from "../../../../util/canvasTools";
import { color2String } from "../../../../util/color/color";
import { getColorRamp } from "../../../../util/color/colorRamps";
import { getMaxRoundedRange, getRangeTicks } from "../../../../util/renderHelpers";
import { getRangeSize, TpRange2D, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { TpElemInfo } from "../interface";
import { TpCanvas2DLegendHor } from "../canvas-2d/interface";
import { getViewportVolumeCoordConvertors, TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { TpLayerDataSpecificsPointsVelocityVolume } from "../canvas-volume/layer-types/layer-points-velocity/layerPointsVelocity.Interface";
import { TpCanvasVolumeRenderData, TpCanvasVolumeRenderLayer } from "../canvas-volume/interface";





export const LEGEND_TYPE_VOL_SIZE = 'legendVolSize';



export function renderVolSizeLegend(legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D, elemInfo: TpElemInfo) {
    const pixelRatio = centralViewport.pixelRatio;

    const layerData = legend.layerData as TpCanvasVolumeRenderLayer;
    const visualSetup = layerData.visualSetup;
    if (!visualSetup) return;

    const viewportVol = centralViewport as TpViewportVolume;

    const {projectionMatrix} = getViewportVolumeCoordConvertors(viewportVol);

    const projFactor = Math.sqrt(projectionMatrix.fxx ** 2 + projectionMatrix.fxy ** 2 + projectionMatrix.fxz ** 2);

    const fullRangeVol = getRangeSize(displayRange.x) / projFactor;
    const roundedRangeVol = getMaxRoundedRange(fullRangeVol / 2);
    const roundedRangeProj = roundedRangeVol * projFactor;

    const top = (displayRange.y.min + 10) * pixelRatio;
    const left = displayRange.x.min * pixelRatio;
    const width = getRangeSize(displayRange.x) * pixelRatio;

    canvasCtx.fillStyle = color2String(getColorSchemaGray(0.3));
    canvasCtx.fillRect(left + width / 2 - roundedRangeProj * pixelRatio / 2, top,
        roundedRangeProj * pixelRatio,
        5 * pixelRatio
    )

    let label =String(roundedRangeVol);
    if (layerData.volumeUnitName) label += ' ' + layerData.volumeUnitName;

    canvasCtx.fillStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'top';
    setCanvasFont(canvasCtx, pixelRatio, 10);
    canvasCtx.fillText(label, left +width / 2, top + 9 *pixelRatio);
}
