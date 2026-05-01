import { getResourceElemTrState, getResourceElemTrStateList } from "../../../../data/elemTrState";
import { TpTableStorage } from "../../../../data/usage/useTablesStorage";
import { theAppColorSchema } from "../../../../util/color/appColorSchema";
import { color2String } from "../../../../util/color/color";
import { createInternalError } from "../../../../util/errors";
import { TpGPURContext } from "../../../../util/render-gpu/interfaces";
import { renderGPUR } from "../../../../util/render-gpu/renderGPU";
import { createViewport2D, getViewport2DCoordConvertors, isValidViewport2D, setViewport2DDisplayRange, TpViewport2D } from "../../../../util/geometry/viewport2D";
import { CHART_CAT_XAXIS_HEIGHT, CHART_MARGIN, CHART_NUM_XAXIS_HEIGHT, clipCanvasArea, renderCoordGrid, renderLassoDrawing, renderTitle } from "../helpers/helpers";
import { SYNCGROUP_TYPES, TpElemInfo, TpResourceRenderContext } from "../interface";
import { getCanvas2DLayerTypeDef } from "./canvas2DDefinition";
import { renderActiveFiltersOverlay, renderCategoricalXAxis, renderNumXAxis, renderNumYAxis, renderRangeSelection, TpMouseDragContext2D } from "./helpers";
import { TpCanvas2DLegendHor, TpCanvas2DRenderData, TpHoverPointInfo2D, TpLabelLogical } from "./interface";
import { getSliceState } from "../legends/sliceLegend";
import { TpSliceData } from "../helpers/slicingHelpers";
import { drawHoverPoint, renderLabels } from "../helpers/renderLabels";
import { TpCanvasVolumeTransientData } from "../canvas-volume/rendering";
import { setResourceThumbnail } from "../../../startpage/ResourceThumbnail";


// We use this structure to keep track of all the element data that is not stored in state,but rather via useRef
export interface TpCanvas2DTransientData {
    elemInfo: TpElemInfo;
    resourceRenderCtx: TpResourceRenderContext;
    loadedTables: TpTableStorage | null;
    canvasBase: HTMLCanvasElement | null;
    canvasOverlay: HTMLCanvasElement | null;
    gpuContext: TpGPURContext | null;
    isZooming: boolean;
    mouseDragContext: TpMouseDragContext2D | null;
    renderData: TpCanvas2DRenderData | null;
    hoverPointInfo: TpHoverPointInfo2D | null;
    centralViewport: TpViewport2D;
    allLegends: TpCanvas2DLegendHor[];
    hideXYAxes: boolean;
}


export function createCanvas2DInitialTransientData(elemInfo: TpElemInfo, resourceRenderCtx: TpResourceRenderContext, centralViewport: TpViewport2D): TpCanvas2DTransientData {
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
        centralViewport,
        allLegends: [],
        hideXYAxes: false,
    }
}


export function getCanvas2DCentralViewport(elemInfo: TpElemInfo, aspectRatio11: boolean): TpViewport2D {
    const elemTrState = getResourceElemTrState(elemInfo);
    if (!elemTrState.state.centralViewport2D) { // not yet present -  we need to create it
        elemTrState.state.centralViewport2D = createViewport2D(aspectRatio11);
        // We need to check if another chart already exists with the same sync group, and fetch the viewport state from there
        for (const targetElemState of getResourceElemTrStateList(elemInfo.resourceUri)) {
            if (targetElemState.state.centralViewport2D) {
                if (targetElemState.syncGroups[SYNCGROUP_TYPES.XAXIS] && (targetElemState.syncGroups[SYNCGROUP_TYPES.XAXIS] == elemInfo.syncGroups[SYNCGROUP_TYPES.XAXIS]))
                    elemTrState.state.centralViewport2D.mapX = { ...targetElemState.state.centralViewport2D.mapX };
                if (targetElemState.syncGroups[SYNCGROUP_TYPES.YAXIS] && (targetElemState.syncGroups[SYNCGROUP_TYPES.YAXIS] == elemInfo.syncGroups[SYNCGROUP_TYPES.YAXIS]))
                    elemTrState.state.centralViewport2D.mapY = { ...targetElemState.state.centralViewport2D.mapY };
            }
        }
    }
    else
        elemTrState.state.centralViewport2D.aspectRatio11 = aspectRatio11; // update it upon rerender in case it was changed
    return elemTrState.state.centralViewport2D;
}


export async function canvasDownloadBitmap(trData: TpCanvas2DTransientData | TpCanvasVolumeTransientData, setAsThumbnail: boolean) {

    let pixelRatio: number = 2;
    if ((trData as any).centralViewport) { // 2D canvas
        const trData2D = trData as TpCanvas2DTransientData;
        pixelRatio = trData2D.centralViewport.pixelRatio;
    }
    if ((trData as any).viewportVolume) { // 3D canvas
        const trDataVolume = trData as TpCanvasVolumeTransientData;
        pixelRatio = trDataVolume.viewportVolume.pixelRatio;
    }

    const canvas = trData.canvasBase;
    if (!canvas) return;
    const renderData = trData.renderData!;

    if (trData.gpuContext) {
        const gpuCanvas = trData.gpuContext!.canvas;
        const vpLeft = renderData.centralViewportMargins.left * pixelRatio;
        const vpTop = renderData.centralViewportMargins.top * pixelRatio;
        const vpRight = canvas.width - renderData.centralViewportMargins.right * pixelRatio;
        const vpBottom = canvas.height - renderData.centralViewportMargins.bottom * pixelRatio;
        canvas.getContext('2d')!.drawImage(gpuCanvas,
            vpLeft,
            vpTop,
            vpRight - vpLeft,
            vpBottom - vpTop
        );
    }

    if (trData.canvasOverlay)
        canvas.getContext('2d')!.drawImage(trData.canvasOverlay, 0, 0, canvas.width, canvas.height);

    if (canvas) {

        if (setAsThumbnail) {
            const blob: Blob = await new Promise((resolve) =>
                canvas.toBlob((b) => resolve(b!), 'image/png')
            );
            const arrayBuffer = await blob.arrayBuffer();
            setResourceThumbnail(trData.resourceRenderCtx.resourceInfo.uri, arrayBuffer);
        } else {
            const url = canvas!.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'image.png';
            link.href = url;
            link.click();
        }

    }
}


export function renderCanvas2DBase(trData: TpCanvas2DTransientData) {
    const centralViewport = trData.centralViewport;
    const canvas = trData.canvasBase;
    if (!canvas) return;
    const renderData = trData.renderData;
    if (!renderData) return;
    if (!isValidViewport2D(centralViewport)) return;
    const canvasCtx: CanvasRenderingContext2D = canvas!.getContext('2d')!;
    if (!canvasCtx) return;
    renderTitle(canvasCtx, centralViewport, renderData.chartTitle, 0);

    if (!trData.hideXYAxes) {
        if (!renderData.xAxisCategories) {
            renderNumXAxis(canvasCtx, centralViewport, renderData);
        } else {
            renderCategoricalXAxis(canvasCtx, centralViewport, renderData);
        }
        renderNumYAxis(canvasCtx, centralViewport, renderData);
    }

    const xAxisHeight = (!trData.hideXYAxes) ? (renderData.xAxisCategories ? CHART_CAT_XAXIS_HEIGHT : CHART_NUM_XAXIS_HEIGHT) : 0;

    let legendOffsetY = centralViewport.displayRange.y.max + xAxisHeight;
    for (const layer of renderData.layers) {
        for (const legend of layer.legendsHor) {
            const displayRange = {
                x: { min: CHART_MARGIN, max: centralViewport.totalDisplayWidth - CHART_MARGIN },
                y: { min: legendOffsetY, max: legendOffsetY + legend.height },
            };
            legend.render(legend, canvasCtx, centralViewport, displayRange, trData.elemInfo);
            legend.lastRenderedDisplayRange = displayRange;
            legendOffsetY += legend.height;
        }
    }

    canvasCtx.save();
    clipCanvasArea(canvasCtx, renderData.centralViewportMargins, centralViewport);
    for (const layer of renderData.layers) {
        if (layer.renderCentral) {
            canvasCtx.save();
            layer.renderCentral(canvasCtx, centralViewport, layer);
            canvasCtx.restore();
        }
    }
    canvasCtx.restore();
}


export function renderCanvas2DOverlay(trData: TpCanvas2DTransientData) {
    const centralViewport = trData.centralViewport;
    const canvas = trData.canvasOverlay;
    if (!canvas) return;
    const renderData = trData.renderData;
    if (!renderData) return;
    if (!isValidViewport2D(centralViewport)) return;
    const canvasCtx: CanvasRenderingContext2D = canvas!.getContext('2d')!;
    if (!canvasCtx) return;
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    canvasCtx.save();
    clipCanvasArea(canvasCtx, renderData.centralViewportMargins, centralViewport);

    for (const layer of renderData.layers) {
        if (layer.renderCentralOverlay) {
            canvasCtx.save();
            layer.renderCentralOverlay(canvasCtx, centralViewport, layer, trData);
            canvasCtx.restore();
        }
    }

    // if (!trData.hideXYAxes)
    renderCoordGrid(canvasCtx, centralViewport, !!renderData.xAxisCategories);
    if (trData.mouseDragContext) {
        if (trData.mouseDragContext.lassoDrawingData.isActive)
            renderLassoDrawing(canvasCtx, centralViewport, trData.mouseDragContext);
        if (trData.mouseDragContext.rangeSelectingData.point1 && trData.mouseDragContext.rangeSelectingData.point2) {
            if (trData.mouseDragContext && trData.mouseDragContext.hRangeSelecting)
                renderRangeSelection(canvasCtx, centralViewport, trData.mouseDragContext);
        }
    }
    renderActiveFiltersOverlay(renderData, trData.loadedTables!, centralViewport, canvasCtx);
    canvasCtx.restore();

    const labels: TpLabelLogical[] = [];
    for (const layer of renderData.layers)
        labels.push(...getCanvas2DLayerTypeDef(layer.layerTypeId).getLabels(trData.resourceRenderCtx, canvasCtx, centralViewport, layer));
    if (labels.length > 0) {
        const { xLogic2Elem, yLogic2Elem } = getViewport2DCoordConvertors(centralViewport);
        const labelsElem = labels.map(label => ({ elemPos: { x: xLogic2Elem(label.logicX), y: yLogic2Elem(label.logicY) }, labelText: label.labelText }))
        renderLabels(canvasCtx, centralViewport, labelsElem);
    }

    if (trData.hoverPointInfo) drawHoverPoint(canvasCtx, centralViewport, trData.hoverPointInfo);
}


export function renderCanvas2D(trData: TpCanvas2DTransientData) {
    const canvas = trData.canvasBase;
    if (!canvas) return;
    if (!isValidViewport2D(trData.centralViewport)) return;
    const canvasCtx: CanvasRenderingContext2D = canvas!.getContext('2d')!;
    if (!canvasCtx) return;
    canvasCtx.fillStyle = color2String(theAppColorSchema.colorBg3);
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    renderCanvas2DBase(trData);
    if (trData.gpuContext) renderGPUR(trData.gpuContext);
    renderCanvas2DOverlay(trData);
}


export function canvas2DUpdateViewPortDisplayDimensions(trData: TpCanvas2DTransientData) {
    if (trData.canvasBase && trData.renderData) {
        // We make sure the viewport is up to date with the canvas dimensions
        trData.centralViewport.totalDisplayWidth = trData.canvasBase.clientWidth;
        trData.centralViewport.totalDisplayHeight = trData.canvasBase.clientHeight;
        const margins = trData.renderData!.centralViewportMargins;
        setViewport2DDisplayRange(trData.centralViewport,
            {
                x: { min: margins.left, max: trData.canvasBase.clientWidth - margins.right },
                y: { min: margins.top, max: trData.canvasBase.clientHeight - margins.bottom },
            });
    }
}


export function canvas2DUpdateResolutions(trData: TpCanvas2DTransientData) {
    const centralViewport = trData.centralViewport;
    if (trData.canvasOverlay && trData.canvasBase) {
        // Adapt canvas resolution to the new size, if necessary
        const width = trData.canvasBase.clientWidth * centralViewport.pixelRatio;
        const height = trData.canvasBase.clientHeight * centralViewport.pixelRatio;
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


export function canvas2DHandleSlicingNotification(trData: TpCanvas2DTransientData) {
    const sliceState = getSliceState(trData.elemInfo);
    for (const layer of trData.renderData!.layers) {
        if (layer.visualSetup?.channelEncodings.slice && (layer.customData as any).sliceValueRange) {
            const sliceValueRange = (layer.customData as any).sliceValueRange;
            const theGpuLayer = layer.gpuLayers[0];// WARNING: a hack: we assume first GPU layer exists and is the primary one
            const slice = (theGpuLayer as any).slice as TpSliceData | undefined;
            if (!slice) throw createInternalError(`GPU layer is expected to have slice info!`);
            slice!.sliceMin = sliceValueRange!.min + sliceState.minFrac * (sliceValueRange!.max - sliceValueRange!.min);
            slice!.sliceMax = sliceValueRange!.min + sliceState.maxFrac * (sliceValueRange!.max - sliceValueRange!.min);
        }
    }
}


export function canvas2DCollectLegends(trData: TpCanvas2DTransientData) {
    trData.allLegends = [];
    if (trData.renderData)
        for (const layer of trData.renderData.layers)
            for (const legend of layer.legendsHor)
                trData.allLegends.push(legend);

}


export function canvas2DRemoveHoverInfo(trData: TpCanvas2DTransientData) {
    // We remove the hover info, but with a delay. Reason: the pointer capture used in the drag handler on Safari seems to trigger onMouseLeave when clicking
    setTimeout(() => { // We remove the hover info, but with a delay. Reason: the pointer capture used in the drag handler on Safari seems to trigger onMouseLeave when clicking
        if (trData.hoverPointInfo) {
            trData.hoverPointInfo = null;
            renderCanvas2DOverlay(trData);
        }
    }, 100);
}