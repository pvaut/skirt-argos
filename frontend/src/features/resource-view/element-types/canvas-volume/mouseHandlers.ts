import { mouseWheelPreventDefaultHandling, TpMouseWheelEvent } from "../../../../util/mouseHandlingHooks";
import { distPoints2DFast, TpPoint2D } from "../../../../util/geometry/point2D";
import { isPointInRange2D } from "../../../../util/geometry/viewport2D";
import { rotateViewportVolume, zoomViewportVolume } from "../../../../util/geometry/viewportVolume";
import { renderCanvasVolume, renderCanvasVolumeOverlay, TpCanvasVolumeTransientData } from "./rendering";
import { broadcastSyncViewportVolume, isInOrientationSphere, performLassoSelectionVolume } from "./helpers";
import { MESSAGE_STOP_VOL_POV_ANIM, TpHoverPointInfoVolume } from "./interface";
import { getCanvasVolumeLayerTypeDef } from "./canvasVolumeDefinition";
import { getSliceInfo, TpLegendMouseDragInfo } from "../helpers/helpers";
import { postAMessage } from "../../../../util/messageBus";
import { roundToDecimals } from "../../../../util/misc";




export function canvasVolumeMouseMoveHandler(trData: TpCanvasVolumeTransientData, ev: any, isAnimating: boolean) {
    const viewport = trData.viewportVolume;
    const renderData = trData.renderData;
    if (!renderData) return;
    if (renderData.layers.length == 0) return;

    if (!trData.canvasOverlay) return;

    const boundingBox = trData.canvasOverlay!.getBoundingClientRect();
    const mouseDispPos: TpPoint2D = {
        x: (ev.clientX - boundingBox.left),
        y: (ev.clientY - boundingBox.top),
    };

    const inOrientationSphere = isInOrientationSphere(trData, mouseDispPos);

    let cursor = "auto";

    for (const legend of trData.allLegends) {
        if (legend.mouseHoverInfo) {
            const mouseHoverInfo = legend.mouseHoverInfo(legend, mouseDispPos);
            if (mouseHoverInfo) cursor = mouseHoverInfo.cursor;
        }
    }

    if (inOrientationSphere) cursor = "grab";

    let newHoverPointInfo: TpHoverPointInfoVolume | null = null;
    if ((!inOrientationSphere) && isPointInRange2D(viewport.displayRange, mouseDispPos)) {
        const targetLayer = renderData.layers[0]; // @todo: do we need to extend this to other layers?
        let allowHover = true;
        if (isAnimating) {
            const rowCount = targetLayer.visualSetup?.tableData.rowCount || 0;
            if (rowCount > 3E6) allowHover = false;
        }
        if (allowHover)
            newHoverPointInfo = getCanvasVolumeLayerTypeDef(targetLayer.layerTypeId).getHoverDataPoint(trData.elemInfo, targetLayer, viewport, mouseDispPos) as TpHoverPointInfoVolume;
    }
    if ((newHoverPointInfo != trData.hoverPointInfo) || (inOrientationSphere != trData.inOrientationSphere)) {
        trData.hoverPointInfo = newHoverPointInfo;
        trData.inOrientationSphere = inOrientationSphere;
        renderCanvasVolumeOverlay(trData);
    }

    trData.canvasOverlay!.style.cursor = cursor;
}


export function canvasVolumeMouseScrollwheelHandler(trData: TpCanvasVolumeTransientData, ev: TpMouseWheelEvent) {
    const viewportVolume = trData.viewportVolume;

    if (trData.hoverPointInfo) {
        trData.hoverPointInfo = null;
        renderCanvasVolumeOverlay(trData);
    }
    if (ev.shiftKey || trData.isZooming || trData.inOrientationSphere) {
        const fc = Math.exp(-ev.deltaMax / 200);
        zoomViewportVolume(viewportVolume, fc);
        broadcastSyncViewportVolume(viewportVolume, trData.elemInfo);
        renderCanvasVolume(trData);
        mouseWheelPreventDefaultHandling(ev);
    }
}



export function canvasVolumeHandleMouseDown(trData: TpCanvasVolumeTransientData, e: any, pos: TpPoint2D) {

    let legendDragInfo: TpLegendMouseDragInfo | null = null;
    for (const legend of trData.allLegends) {
        if (legend.handleMouseDown) {
            const mouseDownInfo = legend.handleMouseDown(legend, pos);
            if (mouseDownInfo) legendDragInfo = {
                legend,
                mouseDragInfo: mouseDownInfo,
            }
        }
    }

    const inOrientationSphere = trData.inOrientationSphere;
    const inCentralDisplayRange = isPointInRange2D(trData.viewportVolume.displayRange, pos);

    const panning = (inCentralDisplayRange && (e.shiftKey || trData.isZooming)) || inOrientationSphere;
    const lassoDrawing = inCentralDisplayRange && (!e.shiftKey) && (!trData.isZooming) && (!inOrientationSphere);

    if (panning || lassoDrawing) // if we start changing the POV, we want to automatically stop any animation
        postAMessage(MESSAGE_STOP_VOL_POV_ANIM, {});

    trData.mouseDragContext = {
        panning,
        lassoDrawing,
        legendDragInfo,
        startPoint: { x: roundToDecimals(pos.x, 0), y: roundToDecimals(pos.y, 0) },
        currentPoint: { ...pos },
        lassoDrawingData: {
            isActive: false,
            isRestricting: e.ctrlKey,
            points: [],
        },
    };
}


const distanceThreshold = 8;


export function canvasVolumeHandleMouseDrag(trData: TpCanvasVolumeTransientData, e: any, pos: TpPoint2D, diff: TpPoint2D) {
    const currentPoint: TpPoint2D = { x: roundToDecimals(pos.x, 0), y: roundToDecimals(pos.y, 0) };
    const mouseDragContext = trData.mouseDragContext!;
    mouseDragContext.currentPoint = currentPoint;

    let fc = 1;
    if (trData.inOrientationSphere) fc = 3;

    if (mouseDragContext.panning) {
        rotateViewportVolume(trData.viewportVolume, fc * diff.x, fc * diff.y);
        trData.hoverPointInfo = null;
        renderCanvasVolume(trData);
        broadcastSyncViewportVolume(trData.viewportVolume, trData.elemInfo);
    }

    if (mouseDragContext.lassoDrawing) {
        if (!mouseDragContext.lassoDrawingData.isActive) {
            if (distPoints2DFast(currentPoint, mouseDragContext.startPoint) > distanceThreshold) {
                mouseDragContext.lassoDrawingData = {
                    ...mouseDragContext.lassoDrawingData,
                    isActive: true,
                    points: [mouseDragContext.startPoint],
                }
                trData.hoverPointInfo = null;
            }
        } else {
            const lastPoint = mouseDragContext.lassoDrawingData.points[mouseDragContext.lassoDrawingData.points.length - 1];
            if (distPoints2DFast(lastPoint, currentPoint) > 15) {
                mouseDragContext.lassoDrawingData.points.push(currentPoint);
            }
        }
    }

    if (mouseDragContext.legendDragInfo)
        mouseDragContext.legendDragInfo.legend.handleMouseDrag!(mouseDragContext.legendDragInfo.legend, pos, mouseDragContext.legendDragInfo.mouseDragInfo);

    renderCanvasVolumeOverlay(trData);
}


export function canvasVolumeHandleMouseUp(trData: TpCanvasVolumeTransientData, e: any) {
    const mouseDragContext = trData.mouseDragContext!;

    if (mouseDragContext.lassoDrawing && mouseDragContext.lassoDrawingData.points.length > 1) {
        const sliceInfo = getSliceInfo(trData);
        performLassoSelectionVolume(trData, mouseDragContext.lassoDrawingData.points, sliceInfo, mouseDragContext.lassoDrawingData.isRestricting);
        e.preventDefault();
    }

    trData.mouseDragContext = null;
    renderCanvasVolumeOverlay(trData);
}


export function canvasVolumeMouseClickHandler(trData: TpCanvasVolumeTransientData, ev: any) {
    const hoverPointInfo = trData.hoverPointInfo;
    if (hoverPointInfo) {
        trData.resourceRenderCtx.addOpenedRow(
            hoverPointInfo.targetLayer.visualSetup!.tableData.tableUri,
            hoverPointInfo.rowKeyIndex);
    }
}


export function canvasVolumeRemoveHoverInfo(trData: TpCanvasVolumeTransientData) {
    // We remove the hover info, but with a delay. Reason: the pointer capture used in the drag handler on Safari seems to trigger onMouseLeave when clicking
    setTimeout(() => { // We remove the hover info, but with a delay. Reason: the pointer capture used in the drag handler on Safari seems to trigger onMouseLeave when clicking
        if (trData.hoverPointInfo || trData.inOrientationSphere) {
            trData.inOrientationSphere = false;
            trData.hoverPointInfo = null;
            renderCanvasVolumeOverlay(trData);
        }
    }, 100);
}