import { getResourceElemTrState, getResourceElemTrStateList } from "../../../../data/elemTrState";
import { TpTableStorage } from "../../../../data/usage/useTablesStorage";
import { theAppColorSchema } from "../../../../util/color/appColorSchema";
import { color2String } from "../../../../util/color/color";
import { TpPoint2D } from "../../../../util/geometry/point2D";
import { TpGPURContext } from "../../../../util/render-gpu/interfaces";
import { renderGPUR } from "../../../../util/render-gpu/renderGPU";
import { createViewportVolume, getViewportVolumeCoordConvertors, setViewportVolumeDisplayRange, TpViewportVolume } from "../../../../util/geometry/viewportVolume";
import { SYNCGROUP_TYPES, TpElemInfo, TpResourceRenderContext } from "../interface";
import { TpCanvasVolumeRenderData, TpHoverPointInfoVolume } from "./interface";
import { TpCanvas2DLegendHor, TpLabelLogical } from "../canvas-2d/interface";
import { createInternalError } from "../../../../util/errors";
import { getSliceState } from "../legends/sliceLegend";
import { TpSliceData } from "../helpers/slicingHelpers";
import { drawHoverPoint, renderLabels } from "../helpers/renderLabels";
import { getCanvasVolumeLayerTypeDef } from "./canvasVolumeDefinition";
import { CHART_MARGIN, clipCanvasArea, renderLassoDrawing, renderTitle, TpLegendMouseDragInfo } from "../helpers/helpers";
import { renderOrientationSphere } from "./helpers";


export interface TpMouseDragContextVolume {
    panning: boolean;
    lassoDrawing: boolean;
    startPoint: TpPoint2D;
    currentPoint: TpPoint2D;
    lassoDrawingData: {
        isActive: boolean;
        isRestricting: boolean;
        points: TpPoint2D[];
    };
    legendDragInfo: TpLegendMouseDragInfo | null;
}


// We use this structure to keep track of all the element data that is not stored in state,but rather via useRef
export interface TpCanvasVolumeTransientData {
    elemInfo: TpElemInfo;
    resourceRenderCtx: TpResourceRenderContext;
    loadedTables: TpTableStorage | null;
    canvasBase: HTMLCanvasElement | null;
    canvasOverlay: HTMLCanvasElement | null;
    gpuContext: TpGPURContext | null;
    isZooming: boolean;

    viewportVolume: TpViewportVolume;
    renderData: TpCanvasVolumeRenderData | null;

    mouseDragContext: TpMouseDragContextVolume | null;
    hoverPointInfo: TpHoverPointInfoVolume | null;
    allLegends: TpCanvas2DLegendHor[];

    animationFrameId?: any;//tracer used for animation
    animationTimeStamp?: DOMHighResTimeStamp;

    inOrientationSphere?: boolean;
}

export function createCanvasVolumeInitialTransientData(elemInfo: TpElemInfo, resourceRenderCtx: TpResourceRenderContext, viewportVolume: TpViewportVolume): TpCanvasVolumeTransientData {
    return {
        elemInfo,
        resourceRenderCtx,
        loadedTables: null,
        canvasBase: null,
        canvasOverlay: null,
        gpuContext: null,
        isZooming: false,
        mouseDragContext: null,
        renderData: null,
        hoverPointInfo: null,
        viewportVolume,
        allLegends: [],
    }
}


export function getCanvasViewportVolume(elemInfo: TpElemInfo): TpViewportVolume {
    const elemTrState = getResourceElemTrState(elemInfo);
    if (!elemTrState.state.viewportVolume) { // not yet present -  we need to create it
        elemTrState.state.viewportVolume = createViewportVolume();
        // We need to check if another chart already exists with the same sync group, and fetch the viewport state from there
        for (const targetElemState of getResourceElemTrStateList(elemInfo.resourceUri)) {
            if (targetElemState.state.viewportVolume) {
                if (targetElemState.syncGroups[SYNCGROUP_TYPES.VOLUME] && (targetElemState.syncGroups[SYNCGROUP_TYPES.VOLUME] == elemInfo.syncGroups[SYNCGROUP_TYPES.VOLUME]))
                    elemTrState.state.viewportVolume = structuredClone(targetElemState.state.viewportVolume);
            }
        }
    }
    if (!elemTrState.state.viewportVolume.volumeBasis) debugger;
    return elemTrState.state.viewportVolume;
}


export function renderCanvasVolumeBase(trData: TpCanvasVolumeTransientData) {
    const viewport = trData.viewportVolume;
    const canvas = trData.canvasBase;
    if (!canvas) return;
    const renderData = trData.renderData;
    if (!renderData) return;
    const canvasCtx: CanvasRenderingContext2D = canvas!.getContext('2d')!;
    if (!canvasCtx) return;
    renderTitle(canvasCtx, viewport, renderData.chartTitle, 90);

    let legendOffsetY = viewport.displayRange.y.max;
    for (const layer of renderData.layers) {
        for (const legend of layer.legendsHor) {
            const displayRange = {
                x: { min: CHART_MARGIN, max: viewport.totalDisplayWidth - CHART_MARGIN },
                y: { min: legendOffsetY, max: legendOffsetY + legend.height },
            };
            legend.render(legend, canvasCtx, viewport, displayRange, trData.elemInfo);
            legend.lastRenderedDisplayRange = displayRange;
            legendOffsetY += legend.height;
        }
    }

}


export function renderCanvasVolumeOverlay(trData: TpCanvasVolumeTransientData) {
    const viewport = trData.viewportVolume;
    const canvas = trData.canvasOverlay;
    if (!canvas) return;
    const renderData = trData.renderData;
    if (!renderData) return;
    const canvasCtx: CanvasRenderingContext2D = canvas!.getContext('2d')!;
    if (!canvasCtx) return;
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    renderOrientationSphere(trData, canvasCtx, !!trData.inOrientationSphere);

    canvasCtx.save();
    clipCanvasArea(canvasCtx, renderData.centralViewportMargins, viewport);
    if (trData.mouseDragContext) {
        if (trData.mouseDragContext.lassoDrawingData.isActive)
            renderLassoDrawing(canvasCtx, viewport, trData.mouseDragContext);
    }
    canvasCtx.restore();

    const labels: TpLabelLogical[] = []
    for (const layer of renderData.layers)
        labels.push(...getCanvasVolumeLayerTypeDef(layer.layerTypeId).getLabels(trData.resourceRenderCtx, canvasCtx, viewport, layer));
    if (labels.length > 0) {
        const { logic2Elem } = getViewportVolumeCoordConvertors(viewport);
        const labelsElem = labels.map(label => ({ elemPos:logic2Elem({x: label.logicX, y: label.logicY, z: label.logicZ!}), labelText: label.labelText }))
        renderLabels(canvasCtx, viewport, labelsElem);
    }

    if (trData.hoverPointInfo) drawHoverPoint(canvasCtx, viewport, trData.hoverPointInfo);
}


export function renderCanvasVolume(trData: TpCanvasVolumeTransientData) {
    // Rerenders all non-DOM content, on the html canvas and webgl canvas
    const canvas = trData.canvasBase;
    if (!canvas) return;
    const canvasCtx: CanvasRenderingContext2D = canvas!.getContext('2d')!;
    if (!canvasCtx) return;
    canvasCtx.fillStyle = color2String(theAppColorSchema.colorBg3);
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    renderCanvasVolumeBase(trData);
    if (trData.gpuContext) renderGPUR(trData.gpuContext);
    renderCanvasVolumeOverlay(trData);
}


export function canvasVolumeUpdateResolutions(trData: TpCanvasVolumeTransientData) {
    const viewportVolume = trData.viewportVolume;
    if (trData.canvasOverlay && trData.canvasBase) {
        // Adapt canvas resolution to the new size, if necessary
        const width = trData.canvasBase.clientWidth * viewportVolume.pixelRatio;
        const height = trData.canvasBase.clientHeight * viewportVolume.pixelRatio;
        if ((trData.canvasBase.width != width) || (trData.canvasBase.height != height)) {
            trData.canvasBase.width = width;
            trData.canvasBase.height = height;
        }
        if ((trData.canvasOverlay.width != width) || (trData.canvasOverlay.height != height)) {
            trData.canvasOverlay.width = width;
            trData.canvasOverlay.height = height;
        }
    }
}


export function canvasVolumeUpdateViewPortDisplayDimensions(trData: TpCanvasVolumeTransientData) {
    if (trData.canvasBase && trData.renderData) {
        // We make sure the viewport is up to date with the canvas dimensions
        trData.viewportVolume.totalDisplayWidth = trData.canvasBase.clientWidth;
        trData.viewportVolume.totalDisplayHeight = trData.canvasBase.clientHeight;
        const margins = trData.renderData!.centralViewportMargins;
        setViewportVolumeDisplayRange(trData.viewportVolume,
            {
                x: { min: margins.left, max: trData.canvasBase.clientWidth - margins.right },
                y: { min: margins.top, max: trData.canvasBase.clientHeight - margins.bottom },
            });
    }
}


export function canvasVolumeHandleSlicingNotification(trData: TpCanvasVolumeTransientData) {
    const sliceState = getSliceState(trData.elemInfo);
    for (const layer of trData.renderData!.layers) {
        if (layer.visualSetup?.channelEncodings.slice && (layer.customData as any).sliceValueRange) {
            const sliceValueRange = (layer.customData as any).sliceValueRange;
            const theGpuLayer = layer.gpuLayers[0]; // WARNING: a hack: we assume first GPU layer exists and is the primary one
            const slice = (theGpuLayer as any).slice as TpSliceData | undefined;
            if (!slice) throw createInternalError(`GPU layer is expected to have slice info!`);
            slice!.sliceMin = sliceValueRange!.min + sliceState.minFrac * (sliceValueRange!.max - sliceValueRange!.min);
            slice!.sliceMax = sliceValueRange!.min + sliceState.maxFrac * (sliceValueRange!.max - sliceValueRange!.min);
        }
    }
}


export function canvasVolumeCollectLegends(trData: TpCanvasVolumeTransientData) {
    trData.allLegends = [];
    if (trData.renderData)
        for (const layer of trData.renderData.layers)
            for (const legend of layer.legendsHor)
                trData.allLegends.push(legend);

}
