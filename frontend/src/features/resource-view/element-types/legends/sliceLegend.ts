import { getResourceElemTrState, getResourceElemTrStateList } from "../../../../data/elemTrState";
import { getColorSchemaGray, theAppColorSchema } from "../../../../util/color/appColorSchema";

import { renderSimpleHatch, setCanvasFont } from "../../../../util/canvasTools";
import { changeOpacity, color2String, darken } from "../../../../util/color/color";
import { postAMessage } from "../../../../util/messageBus";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { getRangeTicks } from "../../../../util/renderHelpers";
import { createSliceState, getArrayValueRange, getRangeSize, TpRange2D, TpSliceState, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { SYNCGROUP_TYPES, TpElemInfo } from "../interface";
import { MESSAGE_UPDATE_SLICE, TpCanvas2DLegendHor } from "../canvas-2d/interface";
import { TpLayerDataSpecificsScatter2D } from "../canvas-2d/layer-types/layer-scatter-2d/layerScatter2D.Interface";
import { findRangeFilter } from "../../../../util/filters/helpers";
import { TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { broadcastSyncSlicing } from "../helpers/helpers";

// "Slicing" is a feature where a property can be used to define a moving window on to restrict the visualised data

export const LEGEND_TYPE_SLICE = 'legendSlice';



export function getSliceState(elemInfo: TpElemInfo): TpSliceState {
    // Returns the current values for a "slice" filter property of a chart
    // which allows tbe user to dynamically change a filtering of a numerical component
    // signature use case: for 3D coordinates, the Z coordinate when X and Y are plotted
    const elemTrState = getResourceElemTrState(elemInfo);
    if (!elemTrState.state.sliceState) { // we need to initialise the slice state
        // First attempt: get it from another chart in the same sync group. This makes sure that, the moment a chart is created (e.g. by opening a tab) it is initiated with the correct synced slice
        for (const targetElemState of getResourceElemTrStateList(elemInfo.resourceUri)) {
            if (targetElemState.syncGroups[SYNCGROUP_TYPES.SLICE] == elemInfo.syncGroups[SYNCGROUP_TYPES.SLICE]) {
                if (targetElemState.state.sliceState)
                    elemTrState.state.sliceState = structuredClone(targetElemState.state.sliceState);
            }
        }
        if (!elemTrState.state.sliceState) // Second attempt: nothing to sync, se we create a new one
            elemTrState.state.sliceState = createSliceState();
    }
    return elemTrState.state.sliceState;
}


export function renderSliceLegend(legend: TpCanvas2DLegendHor, canvasCtx: CanvasRenderingContext2D, centralViewport: TpViewport2D | TpViewportVolume, displayRange: TpRange2D, elemInfo: TpElemInfo) {
    const pixelRatio = centralViewport.pixelRatio;

    const layerData = legend.layerData;
    const visualSetup = layerData.visualSetup;
    if (!visualSetup) return;

    const sliceValueRange = (layerData.customData as TpLayerDataSpecificsScatter2D).sliceValueRange!;

    const top = displayRange.y.min * pixelRatio;
    const left = displayRange.x.min * pixelRatio;
    const width = getRangeSize(displayRange.x) * pixelRatio;

    canvasCtx.fillStyle = color2String(getColorSchemaGray(1));
    canvasCtx.textAlign = 'left';
    canvasCtx.textBaseline = 'top';
    setCanvasFont(canvasCtx, pixelRatio, 10);
    canvasCtx.fillText(visualSetup.channelEncodings.slice.name, left, top);

    canvasCtx.fillStyle = color2String(getColorSchemaGray(0.6));
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'top';
    const rangeMin = sliceValueRange!.min;
    const rangeMax = sliceValueRange!.max;
    const ticks = getRangeTicks({ min: rangeMin, max: rangeMax }, 4);
    for (const tick of ticks) {
        canvasCtx.beginPath();
        canvasCtx.lineWidth = pixelRatio * (tick.label ? 2 : 1);
        const x = left + (tick.value - rangeMin) / (rangeMax - rangeMin) * width;
        canvasCtx.moveTo(x, top + 18 * pixelRatio);
        canvasCtx.lineTo(x, top + 33 * pixelRatio);
        if (tick.label) {
            canvasCtx.fillText(tick.label, x, top + 38 * pixelRatio);

        }
        canvasCtx.stroke()
    }

    const sliceState = getSliceState(elemInfo);

    const x1 = left + sliceState.minFrac * width;
    const x2 = left + sliceState.maxFrac * width;
    let y1 = top + 18 * pixelRatio;
    let y2 = top + 33 * pixelRatio;
    const hGripWidth = 3 * pixelRatio;
    const gripOffs = 3 * pixelRatio;

    canvasCtx.lineWidth = pixelRatio * 2;
    canvasCtx.strokeStyle = color2String(changeOpacity(theAppColorSchema.colorFg, 0.35));
    renderSimpleHatch(canvasCtx, pixelRatio * 8, left, y1, x1, y2);
    renderSimpleHatch(canvasCtx, pixelRatio * 8, x2, y1, left + width, y2);

    canvasCtx.fillStyle = color2String(darken(theAppColorSchema.colorSp2, 0.25));

    canvasCtx.beginPath();
    canvasCtx.roundRect(x1 - 2 * hGripWidth, y1 - gripOffs, 2 * hGripWidth, y2 - y1 + 2 * gripOffs, hGripWidth);
    canvasCtx.roundRect(x2, y1 - gripOffs, 2 * hGripWidth, y2 - y1 + 2 * gripOffs, hGripWidth);
    canvasCtx.fill();

    const arrowOffsetX = Math.min((x2 - x1) * 0.4, 15 * pixelRatio);
    const arrowOffsety1 = 2 * pixelRatio;
    const arrowOffsety2 = 4 * pixelRatio;
    canvasCtx.fillStyle = color2String(changeOpacity(theAppColorSchema.colorSp2, 0.995));
    canvasCtx.beginPath();
    canvasCtx.moveTo(x1, (y1 + y2) / 2);
    canvasCtx.lineTo(x1 + arrowOffsetX, y1 - arrowOffsety1);
    canvasCtx.lineTo(x1 + arrowOffsetX, y1 + arrowOffsety2);
    canvasCtx.lineTo(x2 - arrowOffsetX, y1 + arrowOffsety2);
    canvasCtx.lineTo(x2 - arrowOffsetX, y1 - arrowOffsety1);
    canvasCtx.lineTo(x2, (y1 + y2) / 2);
    canvasCtx.lineTo(x2 - arrowOffsetX, y2 + arrowOffsety1);
    canvasCtx.lineTo(x2 - arrowOffsetX, y2 - arrowOffsety2);
    canvasCtx.lineTo(x1 + arrowOffsetX, y2 - arrowOffsety2);
    canvasCtx.lineTo(x1 + arrowOffsetX, y2 + arrowOffsety1);
    canvasCtx.fill();


    // Render the filter on the slice property, if present

    const activeFilter = findRangeFilter(visualSetup.tableInfo.currentFilterSteps, visualSetup.channelEncodings.slice.id);
    if (activeFilter) {
        const range = activeFilter.range;
        const x1Frac = (range.min - sliceValueRange.min) / (sliceValueRange.max - sliceValueRange.min);
        const x2Frac = (range.max - sliceValueRange.min) / (sliceValueRange.max - sliceValueRange.min);
        const x1 = left + x1Frac * width;
        const x2 = left + x2Frac * width;
        y1 -= 18 *pixelRatio;
        y2 += 18*pixelRatio;

        canvasCtx.strokeStyle = 'rgba(255,128,0,1)';
        canvasCtx.fillStyle = 'rgba(255,128,0,0.30)';
        canvasCtx.setLineDash([3 * pixelRatio, 3 * pixelRatio]);
        canvasCtx.lineWidth = pixelRatio * 1;

        const gradient = canvasCtx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, canvasCtx.fillStyle);
        gradient.addColorStop(0.25, 'transparent');
        gradient.addColorStop(0.75, 'transparent');
        gradient.addColorStop(1, canvasCtx.fillStyle);
        canvasCtx.fillStyle = gradient;

        canvasCtx.fillRect(x1, y1, x2-x1, y2-y1);
        canvasCtx.beginPath();
        canvasCtx.moveTo(x1,y1); canvasCtx.lineTo(x1,y2);
        canvasCtx.moveTo(x2,y1); canvasCtx.lineTo(x2,y2);
        canvasCtx.stroke();
    }

}


export function getSliceLegendMouseHoverInfo(legend: TpCanvas2DLegendHor, pos: TpPoint2D): any {
    const displayRange = legend.lastRenderedDisplayRange;
    if (!displayRange) return null;
    if ((pos.y < displayRange.y.min + 15) || (pos.y > displayRange.y.min + 38)) return null;

    const left = displayRange.x.min;
    const width = getRangeSize(displayRange.x);

    const sliceState = getSliceState(legend.elemInfo);

    const x1 = left + sliceState.minFrac * width;
    const x2 = left + sliceState.maxFrac * width;
    const hGripWidth = 3;

    const canMove = (sliceState.minFrac > 0) || (sliceState.maxFrac < 1);

    if (Math.abs(pos.x - x1 + hGripWidth) <= hGripWidth) return {
        type: "left",
        cursor: "ew-resize",
    }

    if (Math.abs(pos.x - x2 - hGripWidth) <= hGripWidth) return {
        type: "right",
        cursor: "ew-resize",
    }

    if (canMove && (pos.x >= x1) && (pos.x <= x2)) return {
        type: "center",
        cursor: "grab",
    }

    return null;
}

interface TpSliceLegendMouseHandlingInfo {
    moveType: string, // left, center, right
    posXStart: number,
    sliceInitialMinFrac: number,
    sliceInitialMaxFrac: number,
}

export function sliceLegendHandleMouseDown(legend: TpCanvas2DLegendHor, pos: TpPoint2D): TpSliceLegendMouseHandlingInfo | null {
    const displayRange = legend.lastRenderedDisplayRange;
    if (!displayRange) return null;
    const hoverInfo = getSliceLegendMouseHoverInfo(legend, pos);
    if (!hoverInfo) return null;
    const sliceState = getSliceState(legend.elemInfo);

    return {
        posXStart: pos.x,
        sliceInitialMinFrac: sliceState.minFrac,
        sliceInitialMaxFrac: sliceState.maxFrac,
        moveType: hoverInfo.type,
    }
}


export function sliceLegendHandleMouseDrag(legend: TpCanvas2DLegendHor, pos: TpPoint2D, mouseDragInfo: TpSliceLegendMouseHandlingInfo) {
    const displayRange = legend.lastRenderedDisplayRange;
    if (!displayRange) return null;

    const sliceState = getSliceState(legend.elemInfo);
    let shift = (pos.x - mouseDragInfo.posXStart) / getRangeSize(displayRange.x);

    if (mouseDragInfo.moveType == 'left') {
        if (mouseDragInfo.sliceInitialMinFrac + shift < 0)
            shift = -mouseDragInfo.sliceInitialMinFrac;
        if (mouseDragInfo.sliceInitialMinFrac + shift > mouseDragInfo.sliceInitialMaxFrac - 0.002)
            shift = mouseDragInfo.sliceInitialMaxFrac - 0.002 - mouseDragInfo.sliceInitialMinFrac;
        sliceState.minFrac = mouseDragInfo.sliceInitialMinFrac + shift;
    }

    if (mouseDragInfo.moveType == 'right') {
        if (mouseDragInfo.sliceInitialMaxFrac + shift > 1)
            shift = 1 - mouseDragInfo.sliceInitialMaxFrac;
        if (mouseDragInfo.sliceInitialMaxFrac + shift < mouseDragInfo.sliceInitialMinFrac + 0.002)
            shift = mouseDragInfo.sliceInitialMinFrac + 0.002 - mouseDragInfo.sliceInitialMaxFrac;
        sliceState.maxFrac = mouseDragInfo.sliceInitialMaxFrac + shift;
    }

    if (mouseDragInfo.moveType == 'center') {
        if (mouseDragInfo.sliceInitialMinFrac + shift < 0)
            shift = -mouseDragInfo.sliceInitialMinFrac;
        if (mouseDragInfo.sliceInitialMaxFrac + shift > 1)
            shift = 1 - mouseDragInfo.sliceInitialMaxFrac;
        sliceState.minFrac = mouseDragInfo.sliceInitialMinFrac + shift;
        sliceState.maxFrac = mouseDragInfo.sliceInitialMaxFrac + shift;
    }

    // Make sure that the chart for which we are modifying the slicing gets updated
    postAMessage(MESSAGE_UPDATE_SLICE, { elemTrStateId: legend.elemInfo.elemTrStateId });

    // If applicable, update all other charts in the same sync group for slicing
    broadcastSyncSlicing(sliceState, legend.elemInfo);
}


export function sliceLegendHandleMouseUp(legend: TpCanvas2DLegendHor, mouseDragInfo: TpSliceLegendMouseHandlingInfo) { }