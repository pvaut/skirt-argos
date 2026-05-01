import { mouseWheelPreventDefaultHandling, TpMouseWheelEvent } from "../../../../util/mouseHandlingHooks";
import { distPoints2DFast, TpPoint2D } from "../../../../util/geometry/point2D";
import { getViewport2DCoordConvertors, isPointInRange2D, isValidViewport2D, panViewport2D, TpRange, zoomViewport2D } from "../../../../util/geometry/viewport2D";
import { getCanvas2DLayerTypeDef } from "./canvas2DDefinition";
import { broadcastSyncViewport2D, canLassoDraw, canSelectHorizontalRange, performLassoSelection2D, performRangeSelection } from "./helpers";
import { TpHoverPointInfo2D } from "./interface";
import { renderCanvas2D, renderCanvas2DOverlay, TpCanvas2DTransientData } from "./rendering";
import { getSliceInfo, TpLegendMouseDragInfo } from "../helpers/helpers";
import { roundToDecimals } from "../../../../util/misc";




export function canvas2DMouseMoveHandler(trData: TpCanvas2DTransientData, ev: any) {
    const centralViewport = trData.centralViewport;
    const renderData = trData.renderData;
    if (!renderData) return;
    if (renderData.layers.length == 0) return;
    if (!isValidViewport2D(centralViewport)) return;

    if (!trData.canvasOverlay) return;


    const boundingBox = trData.canvasOverlay!.getBoundingClientRect();
    const mouseDispPos: TpPoint2D = {
        x: (ev.clientX - boundingBox.left),
        y: (ev.clientY - boundingBox.top),
    };

    let cursor = "auto";

    for (const legend of trData.allLegends) {
        if (legend.mouseHoverInfo) {
            const mouseHoverInfo = legend.mouseHoverInfo(legend, mouseDispPos);
            if (mouseHoverInfo) cursor = mouseHoverInfo.cursor;
        }
    }

    let newHoverPointInfo: TpHoverPointInfo2D | null = null;
    if (isPointInRange2D(centralViewport.displayRange, mouseDispPos)) {
        const targetLayer = renderData.layers[0]; // @todo: do we need to extend this to other layers?
        newHoverPointInfo = getCanvas2DLayerTypeDef(targetLayer.layerTypeId).getHoverDataPoint(trData.elemInfo, targetLayer, centralViewport, mouseDispPos) as TpHoverPointInfo2D  | null;
    }
    if (newHoverPointInfo != trData.hoverPointInfo) {
        trData.hoverPointInfo = newHoverPointInfo;
        renderCanvas2DOverlay(trData);
    }

    trData.canvasOverlay!.style.cursor = cursor;
}


export function canvas2DMouseClickHandler(trData: TpCanvas2DTransientData, ev: any) {
    const hoverPointInfo = trData.hoverPointInfo;
    if (hoverPointInfo) {
        trData.resourceRenderCtx.addOpenedRow(
            hoverPointInfo.targetLayer.visualSetup!.tableData.tableUri,
            hoverPointInfo.rowKeyIndex);
    }
}


export function canvas2DMouseScrollwheelHandler(trData: TpCanvas2DTransientData, ev: TpMouseWheelEvent) {
    const centralViewport = trData.centralViewport;

    if (trData.hoverPointInfo) {
        trData.hoverPointInfo = null;
        renderCanvas2DOverlay(trData);
    }
    if (ev.shiftKey || trData.isZooming) {
        const { xDisp2Logic, yDisp2Logic } = getViewport2DCoordConvertors(centralViewport);
        const fc = Math.exp(-ev.deltaMax / 200);
        zoomViewport2D(centralViewport, fc, xDisp2Logic(ev.offsetX), yDisp2Logic(ev.offsetY));
        broadcastSyncViewport2D(centralViewport, trData.elemInfo);
        renderCanvas2D(trData);
        mouseWheelPreventDefaultHandling(ev);
    }
}


export function canvas2DHandleMouseDown(trData: TpCanvas2DTransientData, e: any, pos: TpPoint2D) {

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

    const inCentralDisplayRange = isPointInRange2D(trData.centralViewport.displayRange, pos);

    trData.mouseDragContext = {
        coordConvertors: getViewport2DCoordConvertors(trData.centralViewport),
        panning: inCentralDisplayRange && (e.shiftKey || trData.isZooming),
        lassoDrawing: inCentralDisplayRange && (!e.shiftKey) && (!trData.isZooming) && canLassoDraw(trData.renderData),
        hRangeSelecting: inCentralDisplayRange && (!e.shiftKey) && (!trData.isZooming) && canSelectHorizontalRange(trData.renderData),
        legendDragInfo,
        startPoint: { x: roundToDecimals(pos.x, 0), y: roundToDecimals(pos.y, 0) },
        currentPoint: { ...pos },
        lassoDrawingData: {
            isActive: false,
            points: [],
        },
        rangeSelectingData: {},
    };
}


const distanceThreshold = 8;


export function canvas2DHandleMouseDrag(trData: TpCanvas2DTransientData, e: any, pos: TpPoint2D, diff: TpPoint2D) {
    const currentPoint: TpPoint2D = { x: roundToDecimals(pos.x, 0), y: roundToDecimals(pos.y, 0) };
    const mouseDragContext = trData.mouseDragContext!;
    mouseDragContext.currentPoint = currentPoint;
    if (mouseDragContext.panning) {
        panViewport2D(trData.centralViewport, mouseDragContext.coordConvertors, diff.x, diff.y);
        trData.hoverPointInfo = null;
        renderCanvas2D(trData);
        broadcastSyncViewport2D(trData.centralViewport, trData.elemInfo);
    }
    if (mouseDragContext.lassoDrawing) {
        if (!mouseDragContext.lassoDrawingData.isActive) {
            if (distPoints2DFast(currentPoint, mouseDragContext.startPoint) > distanceThreshold) {
                mouseDragContext.lassoDrawingData = {
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
    if (mouseDragContext.hRangeSelecting) {
        if (!mouseDragContext.rangeSelectingData.point1) {
            if (distPoints2DFast(currentPoint, mouseDragContext.startPoint) > distanceThreshold) {
                mouseDragContext.rangeSelectingData.point1 = mouseDragContext.startPoint;
            }
        } else {
            mouseDragContext.rangeSelectingData.point2 = currentPoint;
        }
    }
    if (mouseDragContext.legendDragInfo)
        mouseDragContext.legendDragInfo.legend.handleMouseDrag!(mouseDragContext.legendDragInfo.legend, pos, mouseDragContext.legendDragInfo.mouseDragInfo);
    renderCanvas2DOverlay(trData);
}


export function canvas2DHandleMouseUp(trData: TpCanvas2DTransientData, e: any) {
    const mouseDragContext = trData.mouseDragContext!;

    if (mouseDragContext.lassoDrawing && mouseDragContext.lassoDrawingData.points.length > 1) {
        const sliceInfo = getSliceInfo(trData);
        performLassoSelection2D(trData, mouseDragContext.lassoDrawingData.points, sliceInfo);
        e.preventDefault();
    }

    if (mouseDragContext.hRangeSelecting && mouseDragContext.rangeSelectingData.point1 && mouseDragContext.rangeSelectingData.point2) {
        performRangeSelection(trData, mouseDragContext.rangeSelectingData.point1!, mouseDragContext.rangeSelectingData.point2!);
        e.preventDefault();
    }

    if (mouseDragContext.legendDragInfo)
        mouseDragContext.legendDragInfo.legend.handleMouseUp!(mouseDragContext.legendDragInfo.legend, mouseDragContext.legendDragInfo.mouseDragInfo);
    trData.mouseDragContext = null;
    renderCanvas2DOverlay(trData);
}